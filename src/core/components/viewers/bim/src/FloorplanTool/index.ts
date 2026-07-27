// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'
import { CameraController } from '../lib/CameraController'
import { ChromeController } from '../lib/ChromeController'
import { ClipController } from '../lib/ClipController'
import { CUT_CLASSES, FILL_CLASSES } from '../lib/drawingLayers'
import { disposeDrawing } from '../lib/drawingProjection'
import { GridController } from '../lib/GridController'
import { safeRun, safeRunAsync } from '../lib/safeRun'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'
import { stagePercent } from '../lib/viewSection'

import { FloorplanRenderer } from './src/FloorplanRenderer'
import { StoreyProjector } from './src/StoreyProjector'
import { CUT_COLOR, FILL_COLOR, FLOORPLAN_TOOL_UUID } from './src/types'
import { normalizeElevation } from './src/utils'

import type { RenderStage } from './src/FloorplanRenderer';
import type { FloorplanEntry} from './src/types';
import type { ViewLoadingState } from '../lib/viewSection';

const SLOT_SECTION = 'floorplan:section'
const SLOT_LOWER = 'floorplan:lower'

export type { FloorplanEntry } from './src/types'

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
  /** Fires whenever an entry's layer metadata changes (toggle / color). */
  readonly onLayersChanged = new OBC.Event<FloorplanEntry>()
  /** Fires when the building's true-north angle (in degrees) is updated. */
  readonly onNorthAngleChanged = new OBC.Event<number>()
  /** Fires when line-pick mode toggles on/off. */
  readonly onPickingNorthChanged = new OBC.Event<boolean>()

  private _entries = new Map<string, FloorplanEntry>()
  private _activeId: string | null = null
  /** Sequence guard: when activate() is called multiple times in quick
   *  succession (e.g. user clicks two storeys), only the last call applies
   *  its final state. Prior calls bail out at await boundaries. */
  private _activateSeq = 0
  /** True-north rotation in degrees (clockwise from default screen-up).
   *  Persists across storey switches but resets to 0 on tool dispose. */
  private _northAngle = 0
  /** True while the user is drawing the two-point north line. */
  private _pickingNorth = false
  private _pickHandler: ((e: MouseEvent) => void) | null = null
  private _moveHandler: ((e: MouseEvent) => void) | null = null
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null
  /** First clicked point of the north line, in drawing-local space (Y=0).
   *  Null until the user places the first point. */
  private _drawStart: THREE.Vector3 | null = null
  /** Cached snap targets — projected-geometry vertices flattened as
   *  [x0,z0, x1,z1, …] in drawing-local space. Rebuilt each time draw mode
   *  starts so it reflects the active storey's lines. */
  private _snapVerts: Float32Array | null = null
  /** Rubber-band preview line + cursor snap marker, parented to the active
   *  drawing so they inherit its world transform. */
  private _previewLine: THREE.Line | null = null
  private _snapMarker: THREE.LineSegments | null = null
  /** Canvas cursor before draw mode swapped in the crosshair — typically the
   *  floorplan-mode "grab" hand. Restored (not cleared) on exit so panning
   *  keeps the hand; only leaving floorplan mode reverts to the default. */
  private _savedPickCursor: string | null = null

  private projector: StoreyProjector
  private renderer: FloorplanRenderer
  private camera: CameraController
  private chrome: ChromeController
  private clip: ClipController
  private grid: GridController

  constructor(components: OBC.Components) {
    super(components)
    components.add(FloorplanTool.uuid, this)

    this.projector = new StoreyProjector(components)
    this.renderer = new FloorplanRenderer(components, this.projector)
    this.camera = new CameraController(components)
    this.chrome = new ChromeController(components)
    this.clip = new ClipController(components)
    this.grid = new GridController(components)

    const fragments = components.get(OBC.FragmentsManager)
    fragments.core.onModelLoaded.add((model) => {
      void this.generate(model.modelId)
    })
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

  /** Inject the world grid (typically `bimState.bim.grid`). Without this
   *  the tool falls back to looking it up via `OBC.Grids`. */
  setGrid(grid: any | null) {
    this.grid.setGrid(grid)
  }

  /** Toggle visibility of a single per-class layer on an entry's drawing. */
  setLayerVisible(entryId: string, className: string, visible: boolean) {
    const entry = this._entries.get(entryId)
    if (!entry?.drawing || !entry.drawing.layers.has(className)) return
    entry.drawing.layers.setVisibility(className, visible)
    const meta = entry.layers.find((l) => l.className === className)
    if (meta) meta.visible = visible
    this._requestUpdate()
    this.onLayersChanged.trigger(entry)
  }

  /** Update the color (hex int, e.g. 0xff0000) of a per-class layer. Updates
   *  both the projected-line color in the drawing AND the 3D highlight
   *  color for FILL (slabs / roofs) and CUT (walls / columns / curtain-
   *  walls) classes — so changing the IFCSLAB color repaints both its
   *  outline and its solid fill underneath. */
  async setLayerColor(entryId: string, className: string, color: number) {
    const entry = this._entries.get(entryId)
    if (!entry?.drawing || !entry.drawing.layers.has(className)) return
    entry.drawing.layers.setColor(className, color)
    const meta = entry.layers.find((l) => l.className === className)
    if (meta) meta.color = color

    if (FILL_CLASSES.has(className) || CUT_CLASSES.has(className)) {
      await this._updateClassHighlight(entry, className, color)
    }

    this._requestUpdate()
    this.onLayersChanged.trigger(entry)
  }

  /** Prepend Fill / Cut group-color rows to entry.layers so the sidebar
   *  shows group-level color pickers at the top of the layer list. Idempotent
   *  — removes any existing group entries before re-inserting. */
  private _injectGroupColorLayers(entry: FloorplanEntry) {
    // Read current group colors from the renderer config so subsequent
    // setFillGroupColor / setCutGroupColor calls are reflected immediately.
    const groups = (this.renderer as any)._highlighter?.config?.groups ?? []
    const cutColor: number = (groups[0]?.color as number | undefined) ?? CUT_COLOR
    const fillColor: number = (groups[1]?.color as number | undefined) ?? FILL_COLOR
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

  /** Re-apply the 3D highlight (mesh fill color) for a single IFC class on
   *  the active model, scoped to the active storey. Called after the user
   *  edits a layer color in the sidebar so the 3D underlay stays in sync
   *  with the line color. */
  private async _updateClassHighlight(
    entry: FloorplanEntry,
    className: string,
    color: number,
  ) {
    const fragments = this.components.get(OBC.FragmentsManager)
    const model = fragments.list.get(entry.modelId) as any
    if (!model) return

    // Match this specific class only (no partial-match regex).
    const map = await model.getItemsOfCategories([
      new RegExp(`^${className}$`),
    ])
    let ids = Object.values(map).flat() as number[]

    // Restrict to the active storey so changes don't leak into other floors.
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

  /** Change the 3D fill color for ALL fill-group items (slabs / roofs) on
   *  the active entry. Updates the layer metadata so the sidebar swatch
   *  reflects the change immediately. */
  async setFillGroupColor(entryId: string, color: number) {
    const entry = this._entries.get(entryId)
    if (!entry) return
    await this.renderer.setFillColor(entryId, color)
    const meta = entry.layers.find((l) => l.className === 'DrawingLayers.fill')
    if (meta) meta.color = color
    this.onLayersChanged.trigger(entry)
  }

  /** Change the 3D cut color for ALL cut-group items (walls / columns /
   *  curtain walls) on the active entry. */
  async setCutGroupColor(entryId: string, color: number) {
    const entry = this._entries.get(entryId)
    if (!entry) return
    await this.renderer.setCutColor(entryId, color)
    const meta = entry.layers.find((l) => l.className === 'DrawingLayers.cut')
    if (meta) meta.color = color
    this.onLayersChanged.trigger(entry)
  }

  /** Current true-north rotation (degrees, clockwise from default up). */
  get northAngle(): number {
    return this._northAngle
  }

  /** True while the line-pick mode is awaiting a click on the drawing. */
  get isPickingNorth(): boolean {
    return this._pickingNorth
  }

  /** Set the true-north rotation. Normalised to [0, 360). Applied to the
   *  camera azimuth immediately if a floorplan is currently active so the
   *  view re-orients. */
  setNorthAngle(degrees: number) {
    const normalized = ((degrees % 360) + 360) % 360
    if (this._northAngle === normalized) return
    this._northAngle = normalized
    this.onNorthAngleChanged.trigger(normalized)
    if (this._activeId) this._applyNorthToCamera()
  }

  /** Enter two-point draw mode. The user clicks two points on the active
   *  floorplan (each snapped to the nearest projected-geometry vertex); the
   *  bearing of the segment between them becomes the new true-north angle.
   *  A rubber-band preview + snap marker track the cursor; Esc cancels.
   *  No-op if no floorplan is active. */
  startPickNorth() {
    if (this._pickingNorth || !this._activeId) return
    const entry = this.activeDrawing
    const world = this.components.get(CurrentWorld).world
    if (!entry?.drawing || !world?.renderer) return
    const canvas = world.renderer.three.domElement

    this._drawStart = null
    this._snapVerts = this._collectSnapVertices(entry)

    this._pickHandler = (e: MouseEvent) => this._onPickClick(e)
    this._moveHandler = (e: MouseEvent) => this._onPickMove(e)
    this._keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.cancelPickNorth()
    }
    canvas.addEventListener('click', this._pickHandler)
    canvas.addEventListener('mousemove', this._moveHandler)
    window.addEventListener('keydown', this._keyHandler)
    this._savedPickCursor = canvas.style.cursor
    canvas.style.cursor = 'crosshair'
    this._pickingNorth = true
    this.onPickingNorthChanged.trigger(true)
  }

  /** Exit draw mode without applying any rotation. Tears down the canvas
   *  listeners and removes the rubber-band preview. */
  cancelPickNorth() {
    if (!this._pickingNorth) return
    const world = this.components.get(CurrentWorld).world
    const canvas = world?.renderer?.three.domElement ?? null
    if (canvas) {
      if (this._pickHandler) canvas.removeEventListener('click', this._pickHandler)
      if (this._moveHandler) canvas.removeEventListener('mousemove', this._moveHandler)
      // Restore the floorplan-mode cursor (the grab hand), not the OS default
      // — that only comes back when the tool deactivates.
      canvas.style.cursor = this._savedPickCursor ?? 'grab'
    }
    this._savedPickCursor = null
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler)
    this._pickHandler = null
    this._moveHandler = null
    this._keyHandler = null
    this._drawStart = null
    this._snapVerts = null
    this._clearPreview()
    this._pickingNorth = false
    this.onPickingNorthChanged.trigger(false)
  }

  /** Click handler for draw mode. First click places the start point; the
   *  second rotates the view so the drawn segment becomes parallel to the
   *  screen X-axis (horizontal). Both points lie on the drawing's horizontal
   *  plane (Y=0), so only the in-plane direction matters. */
  private _onPickClick(event: MouseEvent) {
    const entry = this.activeDrawing
    if (!entry?.drawing) return
    const local = this._eventToLocalPoint(event, entry)
    if (!local) return
    const point = this._snap(local)

    if (!this._drawStart) {
      this._drawStart = point
      this._updatePreview(entry, point)
      this._requestUpdate()
      return
    }

    // Ignore a degenerate (near-zero-length) segment so a stray double-click
    // can't set a bogus angle.
    const dx = point.x - this._drawStart.x
    const dz = point.z - this._drawStart.z
    if (dx * dx + dz * dz < 1e-6) return

    // Resolve the segment in WORLD space (the drawing has its own orientTo
    // rotation, so a drawing-local bearing wouldn't match the world-space
    // camera azimuth), then rotate the view to lay it on the X-axis.
    const drawing = entry.drawing
    drawing.three.updateWorldMatrix(true, false)
    const aWorld = drawing.three.localToWorld(this._drawStart.clone())
    const bWorld = drawing.three.localToWorld(point.clone())
    const azimuthDeg = this._azimuthToAlignLineToX(aWorld, bWorld)
    if (azimuthDeg !== null) this.setNorthAngle(azimuthDeg)
    this.cancelPickNorth()
  }

  /** Camera azimuth (degrees) that rotates the top-down view so the world
   *  segment a→b lands parallel to the screen X-axis (horizontal).
   *
   *  Derivation: with the standard Y-up spherical convention camera-controls
   *  uses, the camera's screen-right world direction has angle ρ = −θ + C
   *  (θ = azimuth). We measure ρ₀ and θ₀ from the live camera so C cancels —
   *  making the result independent of the drawing's orientation and the
   *  controls' up-space. We then solve ρ(θ) = λ (the segment's world angle),
   *  giving θ = ρ₀ + θ₀ − λ. Returns null if the controls are unavailable. */
  private _azimuthToAlignLineToX(
    aWorld: THREE.Vector3,
    bWorld: THREE.Vector3,
  ): number | null {
    const world = this.components.get(CurrentWorld).world
    const cam = world?.camera?.three as THREE.Camera | undefined
    const controls = world?.camera?.controls as any
    if (!cam || typeof controls?.azimuthAngle !== 'number') return null

    const lx = bWorld.x - aWorld.x
    const lz = bWorld.z - aWorld.z
    if (lx * lx + lz * lz < 1e-12) return null
    const lambda = Math.atan2(lz, lx)

    // Screen-right = camera local +X axis = first column of matrixWorld.
    cam.updateMatrixWorld()
    const e = cam.matrixWorld.elements
    const rho0 = Math.atan2(e[2], e[0])
    const theta0 = controls.azimuthAngle as number

    return ((rho0 + theta0 - lambda) * 180) / Math.PI
  }

  /** Mousemove handler for draw mode — keeps the snap marker (and, after the
   *  first click, the rubber-band line) glued to the cursor's snapped point. */
  private _onPickMove(event: MouseEvent) {
    const entry = this.activeDrawing
    if (!entry?.drawing) return
    const local = this._eventToLocalPoint(event, entry)
    if (!local) return
    this._updatePreview(entry, this._snap(local))
    this._requestUpdate()
  }

  /** Convert a canvas mouse event into a point on the drawing plane, in
   *  drawing-local space (XZ plane, Y=0). Casts a ray from the active camera,
   *  transforms it into the drawing's local frame, and intersects Y=0. */
  private _eventToLocalPoint(
    event: MouseEvent,
    entry: FloorplanEntry,
  ): THREE.Vector3 | null {
    const world = this.components.get(CurrentWorld).world
    if (!world?.renderer || !world.camera || !entry.drawing) return null
    const canvas = world.renderer.three.domElement
    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(
      new THREE.Vector2(x, y),
      world.camera.three as THREE.Camera,
    )
    const drawing = entry.drawing
    drawing.three.updateWorldMatrix(true, false)
    const inv = new THREE.Matrix4().copy(drawing.three.matrixWorld).invert()
    const origin = raycaster.ray.origin.clone().applyMatrix4(inv)
    const dir = raycaster.ray.direction.clone().transformDirection(inv)
    if (Math.abs(dir.y) < 1e-9) return null
    const t = -origin.y / dir.y
    if (!Number.isFinite(t)) return null
    return new THREE.Vector3(
      origin.x + dir.x * t,
      0,
      origin.z + dir.z * t,
    )
  }

  /** Snap a drawing-local point to the nearest projected-geometry vertex
   *  within the snap radius; returns the point unchanged if none is close. */
  private _snap(local: THREE.Vector3): THREE.Vector3 {
    const verts = this._snapVerts
    if (!verts) return local
    const radius = this._snapRadiusLocal()
    let best = -1
    let bestD2 = radius * radius
    for (let i = 0; i < verts.length; i += 2) {
      const dx = verts[i] - local.x
      const dz = verts[i + 1] - local.z
      const d2 = dx * dx + dz * dz
      if (d2 < bestD2) {
        bestD2 = d2
        best = i
      }
    }
    if (best < 0) return local
    return new THREE.Vector3(verts[best], 0, verts[best + 1])
  }

  /** Snap radius in drawing-local units (= world units; the drawing is
   *  unscaled), derived from a fixed ~12 px tolerance at the current ortho
   *  zoom so it feels consistent as the user zooms. */
  private _snapRadiusLocal(): number {
    const SNAP_PX = 12
    const FALLBACK = 0.5
    const world = this.components.get(CurrentWorld).world
    const cam = world?.camera?.three as any
    const canvas = world?.renderer?.three.domElement
    if (!cam?.isOrthographicCamera || !canvas) return FALLBACK
    const worldWidth = (cam.right - cam.left) / (cam.zoom || 1)
    const worldPerPixel = worldWidth / Math.max(1, canvas.clientWidth)
    return worldPerPixel * SNAP_PX || FALLBACK
  }

  /** Flatten every visible projected line vertex into drawing-local [x,z]
   *  pairs for endpoint snapping. Each vertex is transformed through its
   *  owning object's world matrix into the drawing's local frame, so it
   *  works regardless of how layers nest the `LineSegments`. */
  private _collectSnapVertices(entry: FloorplanEntry): Float32Array | null {
    const drawing = entry.drawing
    if (!drawing) return null
    drawing.three.updateWorldMatrix(true, true)
    const inv = new THREE.Matrix4().copy(drawing.three.matrixWorld).invert()
    const v = new THREE.Vector3()
    const out: number[] = []
    drawing.three.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.LineSegments) || !child.visible) return
      if (child.userData?.isDimension) return
      const pos = child.geometry?.attributes?.position as
        | THREE.BufferAttribute
        | undefined
      if (!pos) return
      for (let i = 0; i < pos.count; i++) {
        v.set(pos.getX(i), pos.getY(i), pos.getZ(i))
          .applyMatrix4(child.matrixWorld)
          .applyMatrix4(inv)
        out.push(v.x, v.z)
      }
    })
    return out.length ? new Float32Array(out) : null
  }

  /** Update (creating on first use) the cursor snap marker and, once the
   *  first point is placed, the rubber-band line from start → cursor. Both
   *  live in drawing-local space, Y=0. */
  private _updatePreview(entry: FloorplanEntry, current: THREE.Vector3) {
    const drawing = entry.drawing
    if (!drawing) return
    const COLOR = 0x2563eb

    if (!this._snapMarker) {
      // Unit-armed cross scaled to the snap radius so it reads as the
      // current snap tolerance.
      const geom = new THREE.BufferGeometry()
      geom.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          new Float32Array([-1, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 1]),
          3,
        ),
      )
      this._snapMarker = new THREE.LineSegments(
        geom,
        new THREE.LineBasicMaterial({ color: COLOR }),
      )
      this._snapMarker.renderOrder = 999
      drawing.three.add(this._snapMarker)
    }
    const arm = this._snapRadiusLocal()
    this._snapMarker.scale.setScalar(arm)
    this._snapMarker.position.set(current.x, 0, current.z)
    this._snapMarker.visible = true

    if (!this._drawStart) {
      if (this._previewLine) this._previewLine.visible = false
      return
    }
    if (!this._previewLine) {
      const geom = new THREE.BufferGeometry()
      geom.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(new Float32Array(6), 3),
      )
      this._previewLine = new THREE.Line(
        geom,
        new THREE.LineBasicMaterial({ color: COLOR }),
      )
      this._previewLine.renderOrder = 999
      drawing.three.add(this._previewLine)
    }
    const pos = this._previewLine.geometry.attributes
      .position as THREE.BufferAttribute
    pos.setXYZ(0, this._drawStart.x, 0, this._drawStart.z)
    pos.setXYZ(1, current.x, 0, current.z)
    pos.needsUpdate = true
    this._previewLine.visible = true
  }

  /** Remove + dispose the preview line and snap marker. Uses each object's
   *  own parent so it stays correct even when called from deactivate(),
   *  where `_activeId` is already null. */
  private _clearPreview() {
    if (this._previewLine) {
      this._previewLine.parent?.remove(this._previewLine)
      this._previewLine.geometry.dispose()
      const m = this._previewLine.material
      if (!Array.isArray(m)) m.dispose()
      this._previewLine = null
    }
    if (this._snapMarker) {
      this._snapMarker.parent?.remove(this._snapMarker)
      this._snapMarker.geometry.dispose()
      const m = this._snapMarker.material
      if (!Array.isArray(m)) m.dispose()
      this._snapMarker = null
    }
    this._requestUpdate()
  }

  /** Push `_northAngle` into the camera-controls azimuth so the view
   *  rotates around the active floor's centre. Called on every activate
   *  and whenever the angle changes while a floorplan is active. */
  private _applyNorthToCamera() {
    const world = this.components.get(CurrentWorld).world
    if (!world?.camera?.controls) return
    const controls = world.camera.controls as any
    const radians = (this._northAngle * Math.PI) / 180
    if (typeof controls.rotateAzimuthTo === 'function') {
      void controls.rotateAzimuthTo(radians, true)
    } else {
      controls.azimuthAngle = radians
    }
  }

  /** Force a render update so layer visibility/color changes paint
   *  immediately even when the camera is at rest. */
  private _requestUpdate() {
    try {
      const fragments = this.components.get(OBC.FragmentsManager)
      void fragments.core.update(true)
    } catch {
      // FragmentsManager not initialized yet — no-op.
    }
  }

  /** Build one entry per IFC storey. Drawings are projected lazily on
   *  first activation. */
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
      const [, coordHeight] = await model.getCoordinates()
      const box = model.box
      const minY = box.min.y
      const maxY = box.max.y

      const created: FloorplanEntry[] = []

      // storeysData is parallel to storeyIds — preserve the mapping so each
      // entry remembers its storey's localId for later per-storey queries.
      for (let i = 0; i < storeysData.length; i++) {
        const storey = storeysData[i]
        const storeyLocalId = storeyIds[i]
        if (!('value' in storey.Name && 'value' in storey.Elevation)) continue

        const name = String(storey.Name.value)
        const rawElev = Number(storey.Elevation.value)
        const elevation = normalizeElevation(rawElev, coordHeight, minY, maxY)

        const entry: FloorplanEntry = {
          id: `${modelId}::${name}`,
          name,
          elevation,
          storeyLocalId,
          modelId,
          drawing: null,
          projected: false,
          layers: [],
        }
        this._entries.set(entry.id, entry)
        created.push(entry)
      }

      this.onDrawingsChanged.trigger(this.drawings)
      return created
    } finally {
      this._emit({ isLoading: false })
    }
  }

  /**
   * Activate a floorplan with progressive feedback. Camera, lighting and
   * clip planes are applied synchronously so the user gets an immediate
   * top-down framing. The slow steps — fill/cut highlighting and line
   * projection — run in parallel and emit stage events as each phase
   * completes, so a loading bar can advance through `init → resolve → cull
   * → fill → cut → project → done`.
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
      // ----- Phase 1: synchronous chrome + clip + camera (instant feedback)
      if (!wasActive) {
        this.chrome.applyLighting()
        this.chrome.applyDrawingBackground()
        // Lock to top-down (polar = 0).
        this.camera.lock(0)
        this.chrome.setCursor()
        this.chrome.disableHighlighter()
        this.chrome.hideGizmo()
      }

      // Section clip just above the drawing plane. StoreyProjector positions
      // the drawing at elevation + 1.5; clip normal is -Y so anything above
      // 1.55 is hidden but the drawing's own lines survive.
      this.clip.set(
        SLOT_SECTION,
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, entry.elevation + 1.5 + 0.05, 0),
      )
      safeRun(() => this._applyLowerClip(entry), 'applyLower')
      safeRun(() => this.grid.hide(), 'hideGrid')

      // Hide previously visible drawings synchronously so they don't bleed
      // through while the new one is being projected.
      for (const other of this._entries.values()) {
        if (other.drawing && other.id !== entry.id) {
          other.drawing.three.visible = false
        }
      }

      this._frameCamera(entry)

      // Mark active immediately so the React UI shows Exit and the user can
      // bail out at any point during loading.
      this._activeId = id
      this.onActiveDrawingChanged.trigger(entry)

      // ----- Phase 2: parallel render + project (slow) -----
      const renderPromise = this.renderer.apply(entry, (stage) => {
        if (seq !== this._activateSeq) return
        this._emit({ isLoading: true, stage })
      })

      // Project once render-stage events have started flowing — this lets
      // the bar progress through resolve/cull/fill/cut while line generation
      // runs in the background. Once render completes we flip to 'project'.
      const projectPromise = this.projector.project(entry)

      renderPromise
        .then(() => {
          if (seq !== this._activateSeq) return
          this._emit({ isLoading: true, stage: 'project' })
        })
        .catch(() => {})

      await Promise.all([renderPromise, projectPromise])
      if (seq !== this._activateSeq) return

      // Drawing visible + editor swap (fast, post-projection).
      const editor = this.components.get(OBF.DrawingEditor)
      editor.activeDrawing = entry.drawing
      if (entry.drawing) {
        entry.drawing.three.visible = true
      }

      // Prepend Fill / Cut group-color controls so the sidebar shows them
      // at the top of the layers list.
      this._injectGroupColorLayers(entry)

      this._emit({ isLoading: false, stage: 'done' })
    } catch (error) {
      console.warn('[FloorplanTool] activate failed:', error)
      this._emit({ isLoading: false })
    }
  }

  /**
   * Exit floorplan mode. Each cleanup step is independently guarded so a
   * failure in one (e.g. resetHighlight on a huge model) cannot strand
   * camera, clip, or gizmo state.
   */
  async deactivate() {
    if (!this._activeId) return

    // Reset active state immediately so the React UI hides Exit and double
    // calls become no-ops.
    this._activeId = null
    this.onActiveDrawingChanged.trigger(null)

    // Drop any in-flight north-pick listener so the canvas stops
    // intercepting clicks once the floorplan is closed.
    safeRun(() => this.cancelPickNorth(), 'cancelPickNorth')

    // Clear editor + drawing visibility (synchronous, fast).
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

    // Restore user-facing state FIRST so input feels responsive even if
    // model-render restoration takes a beat.
    safeRun(() => this.clip.removeAll(), 'removeClips')
    safeRun(() => this.grid.restore(), 'showGrid')
    safeRun(() => this.camera.unlock(), 'unlockCamera')
    safeRun(() => this.chrome.restoreCursor(), 'restoreCursor')
    safeRun(() => this.chrome.restoreHighlighter(), 'restoreHighlighter')
    safeRun(() => this.chrome.showGizmo(), 'showGizmo')
    safeRun(() => this.chrome.removeLighting(), 'removeLighting')
    safeRun(() => this.chrome.restoreBackground(), 'restoreBackground')

    // Slow async step last. Awaited so callers can chain on it, but failures
    // can't undo the synchronous restores above.
    await safeRunAsync(() => this.renderer.restore(), 'restoreModelRendering')

    safeRun(() => this._releaseCoordinator(), 'releaseCoordinator')
  }

  disposeEntriesForModel(modelId: string) {
    let touched = false
    for (const [id, entry] of this._entries) {
      if (entry.modelId !== modelId) continue
      if (this._activeId === id) void this.deactivate()
      disposeDrawing(this.components, entry.drawing)
      this._entries.delete(id)
      this.renderer.invalidateForEntry(id)
      touched = true
    }
    this.renderer.invalidateForModel(modelId)
    this.projector.invalidateForModel(modelId)
    if (touched) this.onDrawingsChanged.trigger(this.drawings)
  }

  dispose() {
    void this.deactivate()
    for (const entry of this._entries.values()) {
      disposeDrawing(this.components, entry.drawing)
    }
    this._entries.clear()
    this.onDrawingsChanged.trigger([])
  }

  private _emit(state: FloorplanLoadingState) {
    this.onGenerationStateChanged.trigger(state)
  }

  /** Mutual-exclusion claim. If ElevationsTool (or any other view tool)
   *  was active, the coordinator awaits its deactivate() first. */
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

  /** Lower clip plane sits just under the active floor's slab (normal +Y),
   *  so ceiling fixtures / lights / equipment of the storey below never
   *  bleed into the projection or the 3D underlay. */
  private _applyLowerClip(entry: FloorplanEntry) {
    const cutY = entry.elevation - 0.5
    this.clip.set(
      SLOT_LOWER,
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, cutY, 0),
    )
  }

  /** Frame the camera over the active floor in orthographic top-down,
   *  then re-apply the building's true-north rotation so storey switches
   *  preserve the user's chosen orientation. */
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
    this._applyNorthToCamera()
  }

}
