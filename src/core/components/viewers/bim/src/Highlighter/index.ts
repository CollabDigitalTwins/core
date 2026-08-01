// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import { DataSet } from '@thatopen/fragments'
import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'
import {
  mergeModelIdMap,
  modelIdMapSize,
  type ModelIdMap,
} from '../lib/bimTree'

import type * as FRAGS from '@thatopen/fragments'

export class Highlighter extends OBC.Component {
  static uuid = 'c0ceb167-5fad-4727-9630-553405d92021' as const

  private _enabled = true
  private world: OBC.World | null = null
  private fragments: OBC.FragmentsManager | null = null
  private _selectedMeshes = new DataSet<THREE.Mesh>()
  private _hoveredMeshes = new DataSet<THREE.Mesh>()
  /** The selection proper, per model. `_selectedLocalIds` is its flattened view. */
  private _selection: ModelIdMap = {}
  private _selectedLocalIds: Set<number> = new Set()
  private _mouse: THREE.Vector2 = new THREE.Vector2()
  private _disabledModels: Set<string> = new Set()
  private _hoverGuardTimeout: number | null = null
  /** Set by `dispose()`. Anything async started before it must check this before touching the world. */
  private _disposed = false
  /** The element the pointer listeners are attached to, so they can be removed after teardown. */
  private _listenerTarget: HTMLElement | null = null

  // Events
  onElementsSelected = new OBC.Event<number[]>()
  onSelectionCleared = new OBC.Event<void>()
  /**
   * Required for `dispose()` to run at all: OBC's `isDisposeable()` is
   * `'dispose' in this && 'onDisposed' in this`, so a component with only `dispose` is skipped
   * during `Components.dispose()` and merely has `enabled = false` set on it.
   */
  readonly onDisposed = new OBC.Event<string>()

  // Selection material
  private _selectedMaterial: THREE.Material = new THREE.MeshBasicMaterial({
    color: 0x73_CE_E2,
    transparent: true,
    opacity: 0.3,
    depthTest: false,
    userData: { _maxSelectedOpacity: 0.3 },
  })

  // Hover material
  private _hoveredMaterial: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({
    color: 0x73_CE_E2,
    transparent: true,
    opacity: 0.15,
    depthTest: false,
  })

  get selectedMaterial() {
    return this._selectedMaterial
  }

  get hoveredMaterial() {
    return this._hoveredMaterial
  }

  get selectedElement() {
    return [...this._selectedLocalIds]
  }

  /**
   * The current selection keyed by model. Prefer this over `selectedElement`
   * when the caller has to act on the right model — `localId`s are only unique
   * within one model, so the flattened list is ambiguous in a federated set.
   */
  get selectedItems(): ModelIdMap {
    return mergeModelIdMap({}, this._selection)
  }

  get selectedMeshes() {
    return this._selectedMeshes
  }

  constructor(components: OBC.Components) {
    super(components)
    components.add(Highlighter.uuid, this)
    this.world = components.get(CurrentWorld).world
    this.fragments = components.get(OBC.FragmentsManager)
    this.setupDataSetHandlers()

    // Disable OBF.Hoverer — we manage hover entirely ourselves so we can
    // respect disabled models and proper depth ordering.
    const hoverer = components.get(OBF.Hoverer)
    hoverer.enabled = false

    this.enabled = true
  }

  private setupDataSetHandlers() {
    const addToScene = (mesh: THREE.Mesh) => {
      if (!this.world) return
      this.world.scene.three.add(mesh)
    }
    const removeFromScene = (mesh: THREE.Mesh) => {
      mesh.removeFromParent()
      // Optional: this runs from a DataSet delete handler, which `dispose()` triggers during
      // teardown. By then the world's scene may already have released these geometries, and a
      // throw here would abort the rest of dispose() and leave listeners and timers alive.
      mesh.geometry?.dispose()
    }

    this._selectedMeshes.onBeforeDelete.add(removeFromScene)
    this._selectedMeshes.onItemAdded.add(addToScene)
    this._selectedMeshes.onCleared.add(() => {
      this._selectedLocalIds.clear()
      this._selection = {}
    })

    this._hoveredMeshes.onBeforeDelete.add(removeFromScene)
    this._hoveredMeshes.onItemAdded.add(addToScene)
  }

  /**
   * Raycasts all models in parallel and returns the nearest hit along with its modelId.
   * Includes disabled models so depth-ordering is respected for suppression.
   */
  private async _nearestHit(mx: number, my: number): Promise<{ modelId: string; localId: number; distance: number } | null> {
    if (!this.world || !this.fragments) return null
    // The world object survives disposal but its camera and renderer are nulled, and OBC's
    // `camera` getter throws rather than returning null. Checking the world alone is not enough.
    if (this._disposed || this.world.isDisposing || !this.world.renderer) return null
    if (!(this.world.camera instanceof OBC.OrthoPerspectiveCamera)) return null
    const params = {
      camera: this.world.camera.three,
      mouse: new THREE.Vector2(mx, my),
      dom: this.world.renderer.three.domElement,
    }
    const hits = await Promise.all(
      [...this.fragments.list.entries()]
        .filter(([modelId]) => !this._disabledModels.has(modelId))
        .map(async ([modelId, model]) => {
          const result = await model.raycast(params)
          return result ? { modelId, localId: result.localId, distance: result.distance } : null
        })
    )
    let nearest: { modelId: string; localId: number; distance: number } | null = null
    for (const hit of hits) {
      if (!hit) continue
      if (!nearest || hit.distance < nearest.distance) nearest = hit
    }
    return nearest
  }

  private onMouseClick = (event: MouseEvent) => {
    this._mouse.x = event.clientX
    this._mouse.y = event.clientY
    void this.click(event)
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.fragments || !this.world) return
    const mx = event.clientX
    const my = event.clientY
    if (this._hoverGuardTimeout !== null) clearTimeout(this._hoverGuardTimeout)
    this._hoverGuardTimeout = window.setTimeout(() => {
      void (async () => {
        const hit = await this._nearestHit(mx, my)
        if (!hit) {
          this.clearHover()
          return
        }
        await this._renderHover(hit.localId, hit.modelId)
      })()
    }, 50)
  }

  private onMouseLeave = () => {
    this.clearHover()
  }

  private setupEvents(active: boolean) {
    // Detach from whatever we attached to, rather than from whatever the world currently
    // exposes. During teardown `world.renderer` is already null, and the old guard sat above
    // the removals, so it skipped them and left canvas listeners firing at a disposed world.
    if (this._listenerTarget) {
      this._listenerTarget.removeEventListener('click', this.onMouseClick)
      this._listenerTarget.removeEventListener('mousemove', this.onMouseMove)
      this._listenerTarget.removeEventListener('mouseleave', this.onMouseLeave)
      this._listenerTarget = null
    }
    if (!active) return
    if (!this.world?.renderer || this.world.isDisposing) return
    const container = this.world.renderer.three.domElement
    container.addEventListener('click', this.onMouseClick)
    container.addEventListener('mousemove', this.onMouseMove)
    container.addEventListener('mouseleave', this.onMouseLeave)
    this._listenerTarget = container
  }

  set enabled(value: boolean) {
    this._enabled = value
    this.setupEvents(value)
    if (!value) this.clearHover()
  }

  get enabled() {
    return this._enabled
  }

  disableModel(modelId: string) {
    this._disabledModels.add(modelId)
    this.clearSelection()
    this.clearHover()
  }

  enableModel(modelId: string) {
    this._disabledModels.delete(modelId)
  }

  isModelDisabled(modelId: string) {
    return this._disabledModels.has(modelId)
  }

  get disabledModels(): ReadonlySet<string> {
    return this._disabledModels
  }

  clearSelection() {
    this._selectedMeshes.clear()
    this._selectedLocalIds.clear()
    this._selection = {}
    this.onSelectionCleared.trigger()
  }

  clearHover() {
    this._hoveredMeshes.clear()
  }

  private async _renderHover(localId: number, modelId: string): Promise<void> {
    await this.hoverItems({ [modelId]: new Set([localId]) })
  }

  /** Raycast all models in parallel, pick the nearest hit, and highlight it. */
  async click(event?: MouseEvent) {
    if (!(this.enabled && this.world && this.fragments)) return
    if (!(this.world.camera instanceof OBC.OrthoPerspectiveCamera)) return

    const isCtrlPressed = event?.ctrlKey
    const hit = await this._nearestHit(this._mouse.x, this._mouse.y)

    if (!hit) {
      if (!isCtrlPressed) this.clearSelection()
      return
    }

    await this.highlightItems({ [hit.modelId]: new Set([hit.localId]) }, isCtrlPressed)
  }

  /**
   * Highlights items across any number of models.
   *
   * This is the selection entry point the sidebar trees use. Ctrl adds to the
   * selection (or removes it when every item is already selected); a plain call
   * replaces it, and re-selecting exactly what is already selected clears.
   */
  async highlightItems(items: ModelIdMap, isCtrlPressed: boolean = false): Promise<void> {
    if (!this.fragments || !this.world) return
    if (modelIdMapSize(items) === 0) return

    try {
      let selection: ModelIdMap

      if (isCtrlPressed) {
        selection = mergeModelIdMap({}, this._selection)
        if (this._containsAll(items)) {
          for (const modelId of Object.keys(items)) {
            const current = selection[modelId]
            if (!current) continue
            for (const localId of items[modelId]) current.delete(localId)
            if (current.size === 0) delete selection[modelId]
          }
        }
        else {
          mergeModelIdMap(selection, items)
        }
      }
      else {
        const isExactlyCurrent =
          this._containsAll(items)
          && modelIdMapSize(this._selection) === modelIdMapSize(items)
        if (isExactlyCurrent) {
          this.clearSelection()
          return
        }
        selection = mergeModelIdMap({}, items)
      }

      // `clear()` resets `_selection` through the DataSet handler, so assign after.
      this._selectedMeshes.clear()
      this._selection = selection
      this._selectedLocalIds = new Set(
        Object.keys(selection).flatMap(modelId => [...selection[modelId]]),
      )

      for (const modelId of Object.keys(selection)) {
        const model = this.fragments.list.get(modelId)
        if (!model) continue
        const localIds = [...selection[modelId]]
        if (localIds.length === 0) continue
        await this._addOverlayMeshes(
          model,
          localIds,
          this._selectedMaterial,
          this._selectedMeshes,
        )
      }

      this.onElementsSelected.trigger([...this._selectedLocalIds])
    }
    catch (error) {
      console.warn('Error highlighting selection:', error)
    }
  }

  /**
   * Single-model selection. Kept for the call sites that already know which
   * model they mean; delegates to {@link highlightItems}.
   */
  async highlightSelection(localIds: number[], modelId?: string, isCtrlPressed: boolean = false): Promise<void> {
    if (!this.fragments || localIds.length === 0) return
    const resolvedModelId = modelId ?? this.fragments.list.keys().next().value
    if (!resolvedModelId) return
    await this.highlightItems({ [resolvedModelId]: new Set(localIds) }, isCtrlPressed)
  }

  /** Hover-highlights items across any number of models. */
  async hoverItems(items: ModelIdMap): Promise<void> {
    if (!this.fragments || !this.world) return
    try {
      this._hoveredMeshes.clear()
      for (const modelId of Object.keys(items)) {
        const model = this.fragments.list.get(modelId)
        if (!model) continue
        const localIds = [...items[modelId]]
        if (localIds.length === 0) continue
        await this._addOverlayMeshes(
          model,
          localIds,
          this._hoveredMaterial,
          this._hoveredMeshes,
        )
      }
    }
    catch (error) {
      console.warn('Error rendering hover:', error)
    }
  }

  /** True when every item in `items` is already selected. */
  private _containsAll(items: ModelIdMap): boolean {
    for (const modelId of Object.keys(items)) {
      const current = this._selection[modelId]
      if (!current) return false
      for (const localId of items[modelId]) {
        if (!current.has(localId)) return false
      }
    }
    return true
  }

  /**
   * Builds overlay meshes for the given items and adds them to `target`.
   * Highlighting is drawn as separate geometry rather than by swapping the
   * model's materials, so the underlying fragment materials stay untouched.
   */
  private async _addOverlayMeshes(
    model: FRAGS.FragmentsModel,
    localIds: number[],
    material: THREE.Material,
    target: DataSet<THREE.Mesh>,
  ): Promise<void> {
    const meshDataArray = await model.getItemsGeometry(localIds)
    const modelWorldMatrix = model.object.matrixWorld

    for (const meshData of meshDataArray) {
      for (const data of meshData) {
        const { positions, normals, indices } = data
        if (!(positions && normals && indices)) continue

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
        geometry.setIndex(new THREE.Uint16BufferAttribute(indices, 1))

        if (data.transform) geometry.applyMatrix4(data.transform)
        geometry.applyMatrix4(modelWorldMatrix)
        geometry.computeVertexNormals()

        target.add(new THREE.Mesh(geometry, material))
      }
    }
  }

  dispose() {
    // Order matters: `enabled = false` clears the hover, which can throw once the world's scene
    // has gone. Cancel the pending raycast first, so a failure later in this method cannot leave
    // a timer that fires against a disposed world.
    this._disposed = true
    if (this._hoverGuardTimeout !== null) {
      clearTimeout(this._hoverGuardTimeout)
      this._hoverGuardTimeout = null
    }
    this.enabled = false
    this.clearSelection()
    this.clearHover()
    this.onElementsSelected.reset()
    this.onSelectionCleared.reset()
    this.onDisposed.trigger(Highlighter.uuid)
    this.onDisposed.reset()
  }
}
