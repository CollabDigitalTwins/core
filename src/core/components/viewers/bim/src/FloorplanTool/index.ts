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
import { stagePercent, ViewLoadingState } from '../lib/viewSection'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'
import { FloorplanRenderer, RenderStage } from './src/FloorplanRenderer'
import { StoreyProjector } from './src/StoreyProjector'
import { CUT_COLOR, FILL_COLOR, FloorplanEntry, FLOORPLAN_TOOL_UUID } from './src/types'
import { normalizeElevation } from './src/utils'

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
  private _pickingNorth = false
  private _pickHandler: ((e: MouseEvent) => void) | null = null

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
      fragments.core.update(true)
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

  /** Enter line-pick mode. The next click on the canvas raycasts against
   *  the active drawing's lines; the hit line's bearing becomes the new
   *  true-north angle. No-op if no floorplan is active. */
  startPickNorth() {
    if (this._pickingNorth || !this._activeId) return
    const world = this.components.get(CurrentWorld).world
    if (!world?.renderer) return
    const canvas = world.renderer.three.domElement
    this._pickHandler = (e: MouseEvent) => this._onPickClick(e)
    canvas.addEventListener('click', this._pickHandler)
    canvas.style.cursor = 'crosshair'
    this._pickingNorth = true
    this.onPickingNorthChanged.trigger(true)
  }

  /** Exit line-pick mode without applying any rotation. */
  cancelPickNorth() {
    if (!this._pickingNorth) return
    const world = this.components.get(CurrentWorld).world
    const canvas = world?.renderer?.three.domElement ?? null
    if (canvas && this._pickHandler) {
      canvas.removeEventListener('click', this._pickHandler)
      canvas.style.cursor = ''
    }
    this._pickHandler = null
    this._pickingNorth = false
    this.onPickingNorthChanged.trigger(false)
  }

  /** Click handler installed during line-pick mode. Raycasts against the
   *  active drawing's `LineSegments` and applies the hit line's bearing
   *  (clockwise from local north) as the new true-north angle. */
  private _onPickClick(event: MouseEvent) {
    const entry = this.activeDrawing
    if (!entry?.drawing) return
    const world = this.components.get(CurrentWorld).world
    if (!world?.renderer || !world?.camera) return
    const canvas = world.renderer.three.domElement
    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    const raycaster = new THREE.Raycaster()
    raycaster.params.Line.threshold = 0.5
    raycaster.setFromCamera(
      new THREE.Vector2(x, y),
      world.camera.three as THREE.Camera,
    )
    const hit = entry.drawing.raycast(raycaster.ray, null)
    if (!hit?.line) {
      // No line hit — keep picking active so the user can try again.
      return
    }
    // Drawing local space: X=right, Z=down-screen, Y=0. Compass bearing
    // (clockwise from local north which is -Z): atan2(dx, -dz).
    const dx = hit.line.end.x - hit.line.start.x
    const dz = hit.line.end.z - hit.line.start.z
    const bearingDeg = (Math.atan2(dx, -dz) * 180) / Math.PI
    this.setNorthAngle(bearingDeg)
    this.cancelPickNorth()
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
      fragments.core.update(true)
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
