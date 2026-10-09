// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'
import { CameraController } from '../lib/CameraController'
import { pumpCameraTransition } from '../lib/cameraTransition'
import { ChromeController } from '../lib/ChromeController'
import { ClipController } from '../lib/ClipController'
import { CUT_CLASSES, FILL_CLASSES } from '../lib/drawingLayers'
import { disposeDrawing } from '../lib/drawingProjection'
import { GridController } from '../lib/GridController'
import { safeRun, safeRunAsync } from '../lib/safeRun'
import { SPACES_LAYER } from '../lib/spaceOverlay'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'
import { stagePercent } from '../lib/viewSection'

import { FloorplanRenderer } from './src/FloorplanRenderer'
import { PlanCutFill } from './src/PlanCutFill'
import { requestPlanRender } from './src/planScene'
import { PlanShapeEditor } from './src/PlanShapeEditor'
import { PlanSketch } from './src/PlanSketch'
import { PluginPlanOverlay } from './src/PluginPlanOverlay'
import { StoreyProjector } from './src/StoreyProjector'
import { CUT_COLOR, FILL_COLOR, FLOORPLAN_TOOL_UUID } from './src/types'
import { anchorStoreyElevations, normalizeElevation, storeyCutPlaneY, storeyFloorY, storeyLowerClipY } from './src/utils'

import type { RenderStage } from './src/FloorplanRenderer';
import type { PlanPoint } from './src/planPointer'
import type { FloorplanEntry} from './src/types';
import type { ViewLoadingState } from '../lib/viewSection';
import type * as FRAGS from '@thatopen/fragments'

const SLOT_SECTION = 'floorplan:section'
const SLOT_LOWER = 'floorplan:lower'

interface StoreyRecord { name: string; rawElevation: number; storeyLocalId: number }

export type { FloorplanEntry } from './src/types'
export type { PlanPoint } from './src/planPointer'
export type { SketchKind } from './src/PlanSketch'
export type { PlanOverlayOptions, PlanOverlayShape } from './src/PluginPlanOverlay'

// Just under the cut plane, so plugin shapes sit above every surviving 3D surface.
const PLAN_OVERLAY_OFFSET = 0.01
const FIT_PADDING = 0.05

export type FloorplanLoadingStage =
  | 'init'
  | 'readingStoreys'
  | RenderStage
  | 'project'
  | 'done'

export type FloorplanLoadingState = ViewLoadingState<FloorplanLoadingStage>

const STAGE_PERCENT: Record<FloorplanLoadingStage, number> = {
  init: 5,
  readingStoreys: 10,
  resolve: 20,
  cull: 35,
  switching: 35,
  cut: 55,
  fill: 75,
  project: 90,
  done: 100,
}

export function getFloorplanStagePercent(
  stage: FloorplanLoadingStage | undefined,
): number {
  return stagePercent(stage, STAGE_PERCENT)
}

export class FloorplanTool extends OBC.Component {
  static uuid = FLOORPLAN_TOOL_UUID

  enabled = false

  readonly onDrawingsChanged = new OBC.Event<FloorplanEntry[]>()
  readonly onActiveDrawingChanged = new OBC.Event<FloorplanEntry | null>()
  readonly onGenerationStateChanged = new OBC.Event<FloorplanLoadingState>()
  readonly onLayersChanged = new OBC.Event<FloorplanEntry>()
  readonly onPickingNorthChanged = new OBC.Event<boolean>()

  private _entries = new Map<string, FloorplanEntry>()
  private _activeId: string | null = null
  // Only the latest activate() applies its final state; earlier calls bail out at each await.
  private _activateSeq = 0
  private _pickingNorth = false

  /** Interactive rectangle/polygon drawing on the open plan, for plugins. */
  readonly sketch: PlanSketch
  /** Interactive reshaping of an existing outline on the open plan, for plugins. */
  readonly editor: PlanShapeEditor
  /** Shapes plugins draw on the open plan, one layer per plugin. */
  readonly overlay: PluginPlanOverlay

  private projector: StoreyProjector
  private renderer: FloorplanRenderer
  private camera: CameraController
  private chrome: ChromeController
  private clip: ClipController
  private cutFill: PlanCutFill
  private grid: GridController

  constructor(components: OBC.Components) {
    super(components)
    components.add(FloorplanTool.uuid, this)

    this.projector = new StoreyProjector(components)
    this.renderer = new FloorplanRenderer(components, this.projector)
    this.camera = new CameraController(components)
    this.chrome = new ChromeController(components)
    this.clip = new ClipController(components)
    this.cutFill = new PlanCutFill(components)
    this.grid = new GridController(components)
    const planY = () => this.activePlanY
    const snapSegments = () => (this.activeDrawing ? this._collectSnapSegments(this.activeDrawing) : null)
    this.sketch = new PlanSketch(components, {
      planY,
      snapSegments,
      setLeftButtonPans: pans => this.camera.setLeftButtonPans(pans),
    })
    this.editor = new PlanShapeEditor(components, { planY, snapSegments })
    this.overlay = new PluginPlanOverlay(components, () => this.isPointerBusy)
    this.overlay.onReplacedSpacesChanged.add(() => this._hideReplacedSpaces())
    this.sketch.onActiveChanged.add(active => this._onPointerToolChanged(active, this.editor))
    this.editor.onActiveChanged.add(active => this._onPointerToolChanged(active, this.sketch))

    const fragments = components.get(OBC.FragmentsManager)
    fragments.core.onModelLoaded.add((model) => {
      void this.generate(model.modelId)
    })
    fragments.list.onItemDeleted.add(this.onModelRemoved)
  }

  /** True while a sketch or a shape edit owns the plan pointer. */
  get isPointerBusy(): boolean {
    return this.sketch.isActive || this.editor.isActive
  }

  // Sketching and reshaping both own the pointer, so starting one ends the other.
  private _onPointerToolChanged(active: boolean, other: { cancel: () => void }) {
    if (!active) return
    other.cancel()
    this.overlay.releasePointer()
  }

  private _hideReplacedSpaces() {
    for (const entry of this._entries.values()) entry.spaces?.setHidden(this.overlay.replacedSpaces(entry.modelId))
    requestPlanRender(this.components)
  }

  // Unloading a model has to take its drawings with it, or they outlive the building they describe.
  private readonly onModelRemoved = (modelId: string) => {
    this.disposeEntriesForModel(modelId)
  }

  get drawings(): FloorplanEntry[] {
    return Array.from(this._entries.values()).sort(
      (a, b) => a.elevation - b.elevation,
    )
  }

  get activeDrawingId() {
    return this._activeId
  }

  get activeDrawing(): FloorplanEntry | null {
    return this._activeId ? this._entries.get(this._activeId) ?? null : null
  }

  /** World height plugin sketches and overlays sit at, or null with no plan open. */
  get activePlanY(): number | null {
    const entry = this.activeDrawing
    return entry ? storeyCutPlaneY(entry.elevation) - PLAN_OVERLAY_OFFSET : null
  }

  /** Without an injected grid the tool falls back to looking it up via `OBC.Grids`. */
  setGrid(grid: any | null) {
    this.grid.setGrid(grid)
  }

  setLayerVisible(entryId: string, className: string, visible: boolean) {
    const entry = this._entries.get(entryId)
    if (!entry?.drawing) return

    // Rooms live outside `drawing.layers`, which only holds line materials.
    if (className === SPACES_LAYER) {
      if (!entry.spaces) return
      entry.spaces.setVisible(visible)
      const spaceMeta = entry.layers.find((l) => l.className === SPACES_LAYER)
      if (spaceMeta) spaceMeta.visible = visible
      requestPlanRender(this.components)
      this.onLayersChanged.trigger(entry)
      return
    }

    if (!entry.drawing.layers.has(className)) return
    entry.drawing.layers.setVisibility(className, visible)
    const meta = entry.layers.find((l) => l.className === className)
    if (meta) meta.visible = visible
    requestPlanRender(this.components)
    this.onLayersChanged.trigger(entry)
  }

  /** Recolours a class's projected lines and, for fill and cut classes, its 3D highlight too. */
  async setLayerColor(entryId: string, className: string, color: number) {
    const entry = this._entries.get(entryId)
    if (!entry?.drawing) return

    // Picking a colour for the rooms also drops the default X, which only reads as a marker on an unstyled fill.
    if (className === SPACES_LAYER) {
      if (!entry.spaces) return
      entry.spaces.setColor(color)
      const spaceMeta = entry.layers.find((l) => l.className === SPACES_LAYER)
      if (spaceMeta) spaceMeta.color = color
      requestPlanRender(this.components)
      this.onLayersChanged.trigger(entry)
      return
    }

    if (!entry.drawing.layers.has(className)) return
    entry.drawing.layers.setColor(className, color)
    const meta = entry.layers.find((l) => l.className === className)
    if (meta) meta.color = color

    if (FILL_CLASSES.has(className) || CUT_CLASSES.has(className)) {
      await this._updateClassHighlight(entry, className, color)
    }

    requestPlanRender(this.components)
    this.onLayersChanged.trigger(entry)
  }

  private _groupColor(index: number, fallback: number): number {
    // The highlighter keeps its live group colours in a private config, with no getter.
    const groups = (this.renderer as any)._highlighter?.config?.groups ?? []
    return (groups[index]?.color as number | undefined) ?? fallback
  }

  private _cutColor(): number {
    return this._groupColor(0, CUT_COLOR)
  }

  private _injectGroupColorLayers(entry: FloorplanEntry) {
    const cutColor = this._cutColor()
    const fillColor = this._groupColor(1, FILL_COLOR)
    const filtered = entry.layers.filter(
      (l) => l.className !== 'DrawingLayers.fill' && l.className !== 'DrawingLayers.cut',
    )
    entry.layers = [
      {
        className: 'DrawingLayers.cut',
        layerName: 'DrawingLayers.cut',
        visible: true,
        color: cutColor,
        itemCount: 0,
        displayKey: 'DrawingLayers.cut',
      },
      {
        className: 'DrawingLayers.fill',
        layerName: 'DrawingLayers.fill',
        visible: true,
        color: fillColor,
        itemCount: 0,
        displayKey: 'DrawingLayers.fill',
      },
      ...filtered,
    ]
  }

  private async _updateClassHighlight(
    entry: FloorplanEntry,
    className: string,
    color: number,
  ) {
    const fragments = this.components.get(OBC.FragmentsManager)
    const model = fragments.list.get(entry.modelId) as any
    if (!model) return

    const map = await model.getItemsOfCategories([
      new RegExp(`^${className}$`),
    ])
    let ids = Object.values(map).flat() as number[]

    try {
      const storeyIds = await this.projector.getCachedStoreyIds(
        entry.modelId,
        entry.storeyLocalId,
        model,
      )
      if (storeyIds.length > 0) {
        const set = new Set(storeyIds)
        ids = ids.filter((id) => set.has(id))
      }
    } catch {
      // best-effort — fall through with unfiltered ids
    }

    if (ids.length === 0) return
    try {
      await model.highlight(ids, {
        color: new THREE.Color(color),
        opacity: 1,
        transparent: false,
        renderedFaces: 1,
        preserveOriginalMaterial: false,
      })
      void fragments.core.update(true)
    } catch (error) {
      console.warn(
        `[FloorplanTool] 3D highlight update failed for ${className}:`,
        error,
      )
    }
  }

  async setFillGroupColor(entryId: string, color: number) {
    const entry = this._entries.get(entryId)
    if (!entry) return
    await this.renderer.setFillColor(entryId, color)
    const meta = entry.layers.find((l) => l.className === 'DrawingLayers.fill')
    if (meta) meta.color = color
    this.onLayersChanged.trigger(entry)
  }

  async setCutGroupColor(entryId: string, color: number) {
    const entry = this._entries.get(entryId)
    if (!entry) return
    await this.renderer.setCutColor(entryId, color)
    this.cutFill.setColor(color)
    requestPlanRender(this.components)
    const meta = entry.layers.find((l) => l.className === 'DrawingLayers.cut')
    if (meta) meta.color = color
    this.onLayersChanged.trigger(entry)
  }

  get isPickingNorth(): boolean {
    return this._pickingNorth
  }

  /** Two clicks on the open plan, resolving the segment's ends, or null when cancelled or no plan is open. */
  async pickNorthLine(): Promise<[PlanPoint, PlanPoint] | null> {
    if (this._pickingNorth || !this.activeDrawing) return null
    const picked = this.sketch.start('segment')
    if (!this.sketch.isActive) return null
    this._pickingNorth = true
    this.onPickingNorthChanged.trigger(true)
    try {
      const points = await picked
      return points?.length === 2 ? [points[0], points[1]] : null
    } finally {
      this._pickingNorth = false
      this.onPickingNorthChanged.trigger(false)
    }
  }

  cancelPickNorth() {
    if (this._pickingNorth) this.sketch.cancel()
  }

  /** Re-projects a model's plans after its transform changed, reopening its open storey. */
  async refreshModel(modelId: string) {
    const reopen = this.activeDrawing?.modelId === modelId ? this.activeDrawing : null
    if (reopen) await this.deactivate()
    this.disposeEntriesForModel(modelId)
    await this.generate(modelId)
    if (!reopen) return
    await this.activate(reopen.id)
    if (reopen.projected) await this.generateLines(reopen.id)
  }

  // Every visible projected line as world `[x0, z0, x1, z1, …]`, for snapping sketch points to walls and corners.
  private _collectSnapSegments(entry: FloorplanEntry): Float32Array | null {
    const drawing = entry.drawing
    if (!drawing) return null
    drawing.three.updateWorldMatrix(true, true)
    const v = new THREE.Vector3()
    const out: number[] = []
    drawing.three.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.LineSegments) || !child.visible) return
      if (child.userData?.isDimension) return
      const geometry = child.geometry as THREE.BufferGeometry | undefined
      const pos = geometry?.attributes?.position as THREE.BufferAttribute | undefined
      if (!pos) return
      const index = geometry?.index
      const count = index ? index.count : pos.count
      for (let i = 0; i + 1 < count; i += 2) {
        for (const j of [i, i + 1]) {
          const vertex = index ? index.getX(j) : j
          v.set(pos.getX(vertex), pos.getY(vertex), pos.getZ(vertex)).applyMatrix4(child.matrixWorld)
          out.push(v.x, v.z)
        }
      }
    })
    return out.length ? new Float32Array(out) : null
  }

  // Zero azimuth puts world X across the screen, so a model turned to project north reads square.
  private _squareCameraToAxes() {
    const world = this.components.get(CurrentWorld).world
    if (!world?.camera?.controls) return
    const controls = world.camera.controls as any
    if (typeof controls.rotateAzimuthTo === 'function') {
      void pumpCameraTransition(this.components, controls.rotateAzimuthTo(0, true))
    } else {
      controls.azimuthAngle = 0
    }
  }

  // The Elevation attribute is in the IFC's own frame, so it is shifted onto where each storey's walls actually stand.
  private async _storeyElevations(
    modelId: string,
    model: FRAGS.FragmentsModel,
    storeys: StoreyRecord[],
  ): Promise<number[]> {
    const anchorIds = Object.values(await model.getItemsOfCategories([/^IFCWALL/, /^IFCCOLUMN/])).flat()
    const boxes: (THREE.Box3 | undefined)[] = anchorIds.length > 0 ? await model.getBoxes(anchorIds) : []
    const bottomById = new Map<number, number>()
    anchorIds.forEach((id, i) => {
      const box = boxes[i]
      if (box && !box.isEmpty()) bottomById.set(id, box.min.y)
    })
    const withFloors = await Promise.all(storeys.map(async (storey) => {
      const contained = await this.projector.getCachedStoreyIds(modelId, storey.storeyLocalId, model)
      const bottoms = contained.flatMap(id => bottomById.get(id) ?? [])
      return { rawElevation: storey.rawElevation, floorY: storeyFloorY(bottoms) }
    }))
    const anchored = anchorStoreyElevations(withFloors)
    if (anchored) return anchored
    const [, coordHeight] = await model.getCoordinates()
    return storeys.map(s => normalizeElevation(s.rawElevation, coordHeight, model.box.min.y, model.box.max.y))
  }

  /** One entry per IFC storey; drawings are projected lazily on first activation. */
  async generate(modelId: string): Promise<FloorplanEntry[]> {
    const fragments = this.components.get(OBC.FragmentsManager)
    const model = fragments.list.get(modelId)
    if (!model) return []

    const sourceWorld = this.components.get(CurrentWorld).world
    if (!sourceWorld) return []

    this._emit({ isLoading: true, stage: 'readingStoreys' })

    try {
      this.disposeEntriesForModel(modelId)
      await this.projector.ensureEditorReady()

      const storeyIds = Object.values(
        await model.getItemsOfCategories([/BUILDINGSTOREY/]),
      ).flat()
      if (storeyIds.length === 0) return []

      const storeysData = await model.getItemsData(storeyIds)
      const storeys: StoreyRecord[] = storeysData.flatMap((storey: any, i: number) =>
        'value' in storey.Name && 'value' in storey.Elevation
          ? [{ name: String(storey.Name.value), rawElevation: Number(storey.Elevation.value), storeyLocalId: storeyIds[i] }]
          : [],
      )
      const elevations = await this._storeyElevations(modelId, model, storeys)

      const created: FloorplanEntry[] = storeys.map((storey, i) => ({
        id: `${modelId}::${storey.name}`,
        name: storey.name,
        elevation: elevations[i],
        storeyLocalId: storey.storeyLocalId,
        modelId,
        drawing: null,
        projected: false,
        layers: [],
      }))
      for (const entry of created) this._entries.set(entry.id, entry)

      this.onDrawingsChanged.trigger(this.drawings)
      return created
    } finally {
      this._emit({ isLoading: false })
    }
  }

  /**
   * Activate a floorplan: chrome, clip planes and camera synchronously, then
   * the fill/cut recolour. Stops at `done` — lines come from `generateLines`.
   */
  async activate(id: string) {
    const entry = this._entries.get(id)
    if (!entry) return
    if (this._activeId === id) return

    const sourceWorld = this.components.get(CurrentWorld).world
    if (!sourceWorld) return

    const seq = ++this._activateSeq
    const wasActive = this._activeId !== null

    this._emit({ isLoading: true, stage: 'init' })

    // Mutual exclusion: deactivate any other view tool before claiming.
    await this._tryClaimCoordinator()
    if (seq !== this._activateSeq) return

    try {
      if (!wasActive) {
        this.chrome.applyLighting()
        this.chrome.applyBasicRender()
        this.chrome.applyDrawingBackground()
        this.camera.lock(0)
        this.chrome.setCursor()
        this.chrome.disableHighlighter()
        this.chrome.hideGizmo()
        safeRun(() => this.chrome.hideSceneContent(), 'hideSceneContent')
      }

      // Clipped 5 cm above the drawing plane so the drawing's own lines survive the cut.
      this.clip.set(
        SLOT_SECTION,
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, storeyCutPlaneY(entry.elevation) + 0.05, 0),
      )
      safeRun(() => this._applyLowerClip(entry), 'applyLower')
      safeRun(() => this.grid.hide(), 'hideGrid')

      for (const other of this._entries.values()) {
        if (other.drawing && other.id !== entry.id) {
          other.drawing.three.visible = false
        }
      }

      this._frameCamera(entry)

      // Active before loading finishes, so the user can exit at any point.
      this._activeId = id
      this.sketch.cancel()
      this.editor.cancel()
      this.overlay.show(storeyCutPlaneY(entry.elevation) - PLAN_OVERLAY_OFFSET)
      this.onActiveDrawingChanged.trigger(entry)

      await this.renderer.apply(entry, (stage) => {
        if (seq !== this._activateSeq) return
        this._emit({ isLoading: true, stage })
      })
      if (seq !== this._activateSeq) return

      await safeRunAsync(() => this.cutFill.show(sourceWorld, storeyCutPlaneY(entry.elevation), this._cutColor()), 'showCutFill')
      if (seq !== this._activateSeq) return

      await this._showDrawing(entry, seq)
      if (seq !== this._activateSeq) return

      this._emit({ isLoading: false, stage: 'done' })
    } catch (error) {
      console.warn('[FloorplanTool] activate failed:', error)
      this._emit({ isLoading: false })
    }
  }

  /**
   * Project the active storey's vector lines. Split out of `activate` because
   * the projection dominates its cost and a plan reads without it.
   */
  async generateLines(id: string) {
    const entry = this._entries.get(id)
    if (!entry || entry.projected) return
    if (this._activeId !== id) return

    const seq = this._activateSeq
    this._emit({ isLoading: true, stage: 'project' })

    try {
      await this.projector.project(entry)
      entry.spaces?.setHidden(this.overlay.replacedSpaces(entry.modelId))
      if (seq !== this._activateSeq) return

      await this._showDrawing(entry, seq, false)
      if (seq !== this._activateSeq) return

      this.sketch.refreshSnapTargets()
      this.editor.refreshSnapTargets()
      this.onLayersChanged.trigger(entry)
      this._emit({ isLoading: false, stage: 'done' })
    } catch (error) {
      console.warn('[FloorplanTool] generateLines failed:', error)
      this._emit({ isLoading: false })
    }
  }

  // Lines generated on an open plan leave the camera alone: the user may already have panned or zoomed.
  private async _showDrawing(entry: FloorplanEntry, seq: number, fit = true) {
    const editor = this.components.get(OBF.DrawingEditor)
    editor.activeDrawing = entry.drawing
    if (entry.drawing) entry.drawing.three.visible = true

    if (fit) await safeRunAsync(() => this._fitToDrawing(entry), 'fitToDrawing')
    if (seq !== this._activateSeq) return

    this._injectGroupColorLayers(entry)
  }

  /** Each cleanup step is guarded on its own, so one failure cannot strand camera, clip or gizmo state. */
  async deactivate() {
    if (!this._activeId) return

    this._activeId = null
    safeRun(() => this.sketch.cancel(), 'cancelSketch')
    safeRun(() => this.editor.cancel(), 'cancelShapeEdit')
    safeRun(() => this.overlay.hide(), 'hideOverlay')
    this.onActiveDrawingChanged.trigger(null)

    safeRun(() => {
      const editor = this.components.get(OBF.DrawingEditor)
      editor.activeDrawing = null
    }, 'clear active drawing')
    for (const entry of this._entries.values()) {
      if (entry.drawing) {
        safeRun(() => {
          entry.drawing!.three.visible = false
        }, 'hide drawing')
      }
    }

    // User-facing state first, so input responds while the slower model restore runs.
    safeRun(() => this.cutFill.hide(), 'hideCutFill')
    safeRun(() => this.clip.removeAll(), 'removeClips')
    safeRun(() => this.grid.restore(), 'showGrid')
    safeRun(() => this.camera.unlock(), 'unlockCamera')
    safeRun(() => this.chrome.restoreCursor(), 'restoreCursor')
    safeRun(() => this.chrome.restoreHighlighter(), 'restoreHighlighter')
    safeRun(() => this.chrome.showGizmo(), 'showGizmo')
    safeRun(() => this.chrome.removeLighting(), 'removeLighting')
    safeRun(() => this.chrome.restoreRenderMode(), 'restoreRenderMode')
    safeRun(() => this.chrome.restoreBackground(), 'restoreBackground')
    safeRun(() => this.chrome.restoreSceneContent(), 'restoreSceneContent')

    await safeRunAsync(() => this.renderer.restore(), 'restoreModelRendering')

    safeRun(() => this._releaseCoordinator(), 'releaseCoordinator')
  }

  disposeEntriesForModel(modelId: string) {
    let touched = false
    for (const [id, entry] of this._entries) {
      if (entry.modelId !== modelId) continue
      if (this._activeId === id) void this.deactivate()
      // The room overlay owns DOM label nodes, which disposing the drawing would leave behind.
      safeRun(() => entry.spaces?.dispose(), 'disposeSpaces')
      disposeDrawing(this.components, entry.drawing)
      this._entries.delete(id)
      this.renderer.invalidateForEntry(id)
      touched = true
    }
    this.renderer.invalidateForModel(modelId)
    this.projector.invalidateForModel(modelId)
    if (touched) this.onDrawingsChanged.trigger(this.drawings)
  }

  /** Frees every drawing but keeps the model subscriptions, so the tool serves the next building. */
  resetAll() {
    this._activateSeq++
    void this.deactivate()
    safeRun(() => {
      this.components.get(OBF.DrawingEditor).activeDrawing = null
    }, 'clear active drawing')
    for (const entry of this._entries.values()) {
      safeRun(() => entry.spaces?.dispose(), 'disposeSpaces')
      disposeDrawing(this.components, entry.drawing)
      this.renderer.invalidateForEntry(entry.id)
      this.projector.invalidateForModel(entry.modelId)
      this.renderer.invalidateForModel(entry.modelId)
    }
    this._entries.clear()
    safeRun(() => this.overlay.clearAll(), 'clearOverlay')
    this.onDrawingsChanged.trigger([])
  }

  dispose() {
    void this.deactivate()
    safeRun(() => this.overlay.clearAll(), 'clearOverlay')
    safeRun(() => this.cutFill.dispose(), 'disposeCutFill')
    safeRun(
      () => this.components.get(OBC.FragmentsManager).list.onItemDeleted.remove(this.onModelRemoved),
      'unsubscribeModelRemoved',
    )
    for (const entry of this._entries.values()) {
      safeRun(() => entry.spaces?.dispose(), 'disposeSpaces')
      disposeDrawing(this.components, entry.drawing)
    }
    this._entries.clear()
    this.onDrawingsChanged.trigger([])
  }

  private _emit(state: FloorplanLoadingState) {
    this.onGenerationStateChanged.trigger(state)
  }

  private async _tryClaimCoordinator() {
    try {
      const coordinator = this.components.get(ViewModeCoordinator)
      await coordinator.claim(this)
    } catch {
      // ViewModeCoordinator not registered in this viewer — ignore.
    }
  }

  private _releaseCoordinator() {
    try {
      this.components.get(ViewModeCoordinator).release(this)
    } catch {
      // ignore
    }
  }

  // Just under the active floor's slab, so the storey below's ceiling fixtures never reach the plan.
  private _applyLowerClip(entry: FloorplanEntry) {
    const cutY = storeyLowerClipY(entry.elevation)
    this.clip.set(
      SLOT_LOWER,
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, cutY, 0),
    )
  }

  // The camera squares up first: the fit uses an axis-aligned box, so rotating after it could push content out of frame.
  private async _fitToDrawing(entry: FloorplanEntry) {
    if (!entry.drawing) return

    const box = new THREE.Box3().setFromObject(entry.drawing.three)
    if (box.isEmpty()) {
      this._frameCamera(entry)
      return
    }

    this._squareCameraToAxes()
    await this._fitPlanBox(box)
  }

  /** Fits the open plan's view to an outline in world plan coordinates; no-op with no plan open. */
  async framePoints(points: readonly PlanPoint[], padding = 0.25) {
    const planY = this.activePlanY
    if (planY === null || points.length === 0) return
    const box = new THREE.Box3().setFromPoints(points.map(point => new THREE.Vector3(point.x, planY, point.z)))
    box.expandByScalar(Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 1) * padding)
    await safeRunAsync(() => this._fitPlanBox(box), 'framePoints')
  }

  // An orthographic plan's scale is its zoom, not its distance, so framing has to go through fitToBox.
  private async _fitPlanBox(box: THREE.Box3) {
    const controls = this.components.get(CurrentWorld).world?.camera?.controls
    if (!controls) return
    const pad = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * FIT_PADDING
    await pumpCameraTransition(this.components, controls.fitToBox(box, true, {
      paddingTop: pad, paddingBottom: pad, paddingLeft: pad, paddingRight: pad,
    }))
  }

  private _frameCamera(entry: FloorplanEntry) {
    const fragments = this.components.get(OBC.FragmentsManager)
    const model = fragments.list.get(entry.modelId)
    if (!model) return
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    model.box.getCenter(center)
    model.box.getSize(size)
    const span = Math.max(size.x, size.z, 10)
    const target = new THREE.Vector3(
      center.x,
      entry.elevation + 1.2,
      center.z,
    )
    this.camera.frame(target, new THREE.Vector3(0, -1, 0), span)
    this._squareCameraToAxes()
    const storey = new THREE.Box3(
      new THREE.Vector3(model.box.min.x, entry.elevation, model.box.min.z),
      new THREE.Vector3(model.box.max.x, entry.elevation + 1.2, model.box.max.z),
    )
    void safeRunAsync(() => this._fitPlanBox(storey), 'fitToModel')
  }

}
