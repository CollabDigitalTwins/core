import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'
import { CurrentWorld } from '../CurrentWorld'
import { CameraController } from '../lib/CameraController'
import { CategoryHighlighter, StageEmitter } from '../lib/CategoryHighlighter'
import { ChromeController } from '../lib/ChromeController'
import { ClipController } from '../lib/ClipController'
import { disposeDrawing } from '../lib/drawingProjection'
import { GridController } from '../lib/GridController'
import { safeRun, safeRunAsync } from '../lib/safeRun'
import { stagePercent } from '../lib/viewSection'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'
import { ElevationProjector } from './src/ElevationProjector'
import {
  ELEVATION_STAGE_PERCENT,
  ELEVATIONS_TOOL_UUID,
  ElevationEntry,
  ElevationLoadingStage,
  ElevationLoadingState,
} from './src/types'

export type {
  ElevationEntry,
  ElevationLoadingStage,
  ElevationLoadingState,
} from './src/types'

export function getElevationStagePercent(
  stage: ElevationLoadingStage | undefined,
): number {
  return stagePercent(stage, ELEVATION_STAGE_PERCENT)
}

const SLOT_SECTION = 'elevation:section'

/**
 * Elevation drawings (N/S/E/W) per loaded model, built on the same
 * DrawingEditor + TechnicalDrawings pipeline as FloorplanTool. Activate
 * runs in stages — init → resolve → cull → project → done — so the
 * sidebar can show a progress bar and the user gets immediate camera
 * framing while the slow projection runs in the background.
 *
 * The model itself is hidden during the elevation view so projected lines
 * from front and back of the building both read clearly. Style each IFC
 * class via the per-class drawing layers (visibility + color in the
 * sidebar).
 */
export class ElevationsTool extends OBC.Component {
  static uuid = ELEVATIONS_TOOL_UUID

  enabled = false

  readonly onElevationsChanged = new OBC.Event<ElevationEntry[]>()
  readonly onActiveChanged = new OBC.Event<ElevationEntry | null>()
  readonly onLoadingStateChanged = new OBC.Event<ElevationLoadingState>()
  /** Fires whenever an entry's layer metadata changes (toggle / color). */
  readonly onLayersChanged = new OBC.Event<ElevationEntry>()

  private _entries = new Map<string, ElevationEntry>()
  private _activeId: string | null = null
  private _activateSeq = 0

  private projector: ElevationProjector
  private highlighter: CategoryHighlighter
  private camera: CameraController
  private chrome: ChromeController
  private clip: ClipController
  private grid: GridController

  constructor(components: OBC.Components) {
    super(components)
    components.add(ElevationsTool.uuid, this)

    this.projector = new ElevationProjector(components)
    this.camera = new CameraController(components)
    this.chrome = new ChromeController(components)
    this.clip = new ClipController(components)
    this.grid = new GridController(components)
    // No face-fill groups: the cull pass hides the whole model, then the
    // line projection paints on top of an empty scene. Filling front faces
    // (the previous behaviour) was occluding back-of-building elements,
    // which the user wanted to see in elevation. Only the projected lines
    // remain visible — the per-IFC-class drawing layers are how the user
    // styles them.
    this.highlighter = new CategoryHighlighter(components, {
      groups: [],
    })

    const fragments = components.get(OBC.FragmentsManager)
    fragments.core.onModelLoaded.add((model) => {
      void this.generate(model.modelId)
    })
  }

  get elevations(): ElevationEntry[] {
    return [...this._entries.values()]
  }

  get activeId(): string | null {
    return this._activeId
  }

  get activeElevation(): ElevationEntry | null {
    if (!this._activeId) return null
    return this._entries.get(this._activeId) ?? null
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

  /** Update the color (hex int, e.g. 0xff0000) of a per-class layer. */
  setLayerColor(entryId: string, className: string, color: number) {
    const entry = this._entries.get(entryId)
    if (!entry?.drawing || !entry.drawing.layers.has(className)) return
    entry.drawing.layers.setColor(className, color)
    const meta = entry.layers.find((l) => l.className === className)
    if (meta) meta.color = color
    this._requestUpdate()
    this.onLayersChanged.trigger(entry)
  }

  private _requestUpdate() {
    try {
      const fragments = this.components.get(OBC.FragmentsManager)
      fragments.core.update(true)
    } catch {
      // FragmentsManager not initialized yet — no-op.
    }
  }

  /** Build the four elevation entries for a freshly loaded model. */
  async generate(modelId: string): Promise<ElevationEntry[]> {
    const fragments = this.components.get(OBC.FragmentsManager)
    const model = fragments.list.get(modelId)
    if (!model) return []
    const sourceWorld = this.components.get(CurrentWorld).world
    if (!sourceWorld) return []

    this._emit({ isLoading: true, stage: 'readingModel' })
    try {
      this.disposeEntriesForModel(modelId)
      await this.projector.ensureEditorReady()

      const created = this.projector.buildEntries(modelId, model.box)
      for (const entry of created) this._entries.set(entry.id, entry)

      this.onElevationsChanged.trigger(this.elevations)
      return created
    } finally {
      this._emit({ isLoading: false })
    }
  }

  /**
   * Activate an elevation: chrome + section clip + camera frame applied
   * synchronously for instant feedback, then face-highlighting and line
   * projection run in parallel with stage events.
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
      // ----- Phase 1: synchronous chrome + clip + camera (instant) -----
      if (!wasActive) {
        this.chrome.applyLighting()
        // Lock to side-on (polar = π/2 = horizontal).
        this.camera.lock(Math.PI / 2)
        this.chrome.setCursor()
        this.chrome.disableHighlighter()
        this.chrome.hideGizmo()
      }

      // Section clip just behind the drawing plane so we don't see the
      // far side of the building bleeding through.
      const clipNormal = entry.viewDirection.clone().negate()
      const clipPoint = entry.position.clone().addScaledVector(clipNormal, -0.05)
      this.clip.set(SLOT_SECTION, clipNormal, clipPoint)

      safeRun(() => this.grid.hide(), 'hideGrid')

      // Hide previously visible drawings so they don't bleed through.
      for (const other of this._entries.values()) {
        if (other.drawing && other.id !== entry.id) {
          other.drawing.three.visible = false
        }
      }

      this._frameCamera(entry)

      this._activeId = id
      this.onActiveChanged.trigger(entry)

      // ----- Phase 2: parallel render + project (slow) -----
      const renderPromise = this.highlighter.apply(
        entry.id,
        async () => ({ modelId: entry.modelId, filterIds: null }),
        ((stage: string) => {
          if (seq !== this._activateSeq) return
          this._emit({
            isLoading: true,
            stage: stage as ElevationLoadingStage,
          })
        }) as StageEmitter,
      )
      const projectPromise = this.projector.project(entry)

      renderPromise
        .then(() => {
          if (seq !== this._activateSeq) return
          this._emit({ isLoading: true, stage: 'project' })
        })
        .catch(() => {})

      await Promise.all([renderPromise, projectPromise])
      if (seq !== this._activateSeq) return

      const editor = this.components.get(OBF.DrawingEditor)
      editor.activeDrawing = entry.drawing
      if (entry.drawing) entry.drawing.three.visible = true

      this._emit({ isLoading: false, stage: 'done' })
    } catch (error) {
      console.warn('[ElevationsTool] activate failed:', error)
      this._emit({ isLoading: false })
    }
  }

  /** Robust exit. Each cleanup step runs independently so a failure in one
   *  cannot strand the camera, lighting, or clip state. */
  async deactivate() {
    if (!this._activeId) return

    this._activeId = null
    this.onActiveChanged.trigger(null)

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

    safeRun(() => this.clip.removeAll(), 'removeClips')
    safeRun(() => this.grid.restore(), 'showGrid')
    safeRun(() => this.camera.unlock(), 'unlockCamera')
    safeRun(() => this.chrome.restoreCursor(), 'restoreCursor')
    safeRun(() => this.chrome.restoreHighlighter(), 'restoreHighlighter')
    safeRun(() => this.chrome.showGizmo(), 'showGizmo')
    safeRun(() => this.chrome.removeLighting(), 'removeLighting')

    await safeRunAsync(
      () => this.highlighter.restore(),
      'restoreModelRendering',
    )

    safeRun(() => this._releaseCoordinator(), 'releaseCoordinator')
  }

  disposeEntriesForModel(modelId: string) {
    let touched = false
    for (const [id, entry] of this._entries) {
      if (entry.modelId !== modelId) continue
      if (this._activeId === id) void this.deactivate()
      disposeDrawing(this.components, entry.drawing)
      this._entries.delete(id)
      this.highlighter.invalidateForEntry(id)
      touched = true
    }
    this.highlighter.invalidateForModel(modelId)
    if (touched) this.onElevationsChanged.trigger(this.elevations)
  }

  dispose() {
    void this.deactivate()
    for (const entry of this._entries.values()) {
      disposeDrawing(this.components, entry.drawing)
    }
    this._entries.clear()
    this.onElevationsChanged.trigger([])
  }

  private _frameCamera(entry: ElevationEntry) {
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    entry.modelBox.getCenter(center)
    entry.modelBox.getSize(size)
    const span = Math.max(size.x, size.y, size.z, 10)
    this.camera.frame(center, entry.viewDirection, span)
  }

  private _emit(state: ElevationLoadingState) {
    this.onLoadingStateChanged.trigger(state)
  }

  /** Mutual-exclusion claim. If FloorplanTool (or any other view tool)
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
}
