// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as THREE from 'three'
import * as OBC from '@thatopen/components'
import type * as FRAGS from '@thatopen/fragments'
import { CurrentWorld } from '../CurrentWorld'

export interface BimModelInfo {
  id: string
  name: string
  model: FRAGS.FragmentsModel
}

export interface BimTransformOptions {
  position?: THREE.Vector3
  rotation?: THREE.Euler
  scale?: number | THREE.Vector3
}

export class BIMManager extends OBC.Component {
  static uuid = 'b2c1a0f9-3d4e-4c8b-9a7d-1e5f6g7h8i9j' as const

  enabled = true

  /** Triggered when a model is registered with the manager. */
  onModelAdded = new OBC.Event<BimModelInfo>()

  /** Triggered whenever a model's transform is changed through this manager. */
  onModelTransformed = new OBC.Event<BimModelInfo>()

  private _components: OBC.Components
  private _world: OBC.World | null = null
  private _models: Map<string, BimModelInfo> = new Map()
  private _nameOverrides: Map<string, string> = new Map()

  constructor(components: OBC.Components) {
    super(components)
    components.add(BIMManager.uuid, this)
    this._components = components
    this._world = components.get(CurrentWorld).world
    this._syncWithFragments(components)
  }

  /**
   * Retroactively registers all models already in the fragments list and
   * subscribes to future loads so BIMManager stays in sync regardless of
   * when it is first instantiated.
   */
  private _syncWithFragments(components: OBC.Components): void {
    let fragManager: OBC.FragmentsManager
    try {
      fragManager = components.get(OBC.FragmentsManager)
    }
    catch {
      return
    }

    // Register models that are already loaded
    for (const [modelId, model] of fragManager.core.models.list) {
      if (!this._models.has(modelId)) {
        this._registerFragModel(model)
      }
    }

    // Listen for future loads
    fragManager.core.onModelLoaded.add((model: FRAGS.FragmentsModel) => {
      if (!this._models.has(model.modelId)) {
        this._registerFragModel(model)
      }
    })
  }

  /** Low-level helper: register a FragmentsModel using its own modelId as key. */
  private _registerFragModel(model: FRAGS.FragmentsModel): void {
    const id = model.modelId
    const info: BimModelInfo = {
      id,
      name: this._nameOverrides.get(id) ?? id,
      model,
    }
    this._models.set(id, info)
    this.onModelAdded.trigger(info)
  }

  /**
   * Update the display name for a registered model.
   * Useful when the DbFile name becomes known after the model was auto-registered.
   */
  setName(id: string, name: string): void {
    this._nameOverrides.set(id, name)
    const info = this._models.get(id)
    if (info) {
      info.name = name
    }
  }

  add(
    model: FRAGS.FragmentsModel,
    id: string,
    name: string,
    options: BimTransformOptions = {},
  ): BimModelInfo {
    if (options.position) {
      model.object.position.copy(options.position)
    }

    if (options.rotation) {
      model.object.rotation.copy(options.rotation)
    }

    if (options.scale) {
      if (typeof options.scale === 'number') {
        model.object.scale.setScalar(options.scale)
      }
      else {
        model.object.scale.copy(options.scale)
      }
    }

    const modelInfo: BimModelInfo = { id, name, model }
    this._models.set(id, modelInfo)
    ;(model.object as any).bimModelId = id

    this.onModelAdded.trigger(modelInfo)
    return modelInfo
  }

  remove(id: string): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return false
    this._models.delete(id)
    return true
  }

  getModel(id: string): BimModelInfo | undefined {
    return this._models.get(id)
  }

  /** Get all registered model infos. */
  getAllModels(): BimModelInfo[] {
    return [...this._models.values()]
  }

  async getCoordinationMatrix(id: string): Promise<THREE.Matrix4 | null> {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return null
    return modelInfo.model.getCoordinationMatrix()
  }

  async applyCoordinationMatrix(id: string): Promise<boolean> {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return false

    const coordMatrix = await modelInfo.model.getCoordinationMatrix()
    coordMatrix.decompose(
      modelInfo.model.object.position,
      modelInfo.model.object.quaternion,
      modelInfo.model.object.scale,
    )
    modelInfo.model.object.updateMatrixWorld(true)

    this.onModelTransformed.trigger(modelInfo)
    return true
  }

  setMatrix(id: string, matrix: THREE.Matrix4): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return false

    matrix.decompose(
      modelInfo.model.object.position,
      modelInfo.model.object.quaternion,
      modelInfo.model.object.scale,
    )
    modelInfo.model.object.updateMatrixWorld(true)

    this.onModelTransformed.trigger(modelInfo)
    return true
  }

  getMatrix(id: string): THREE.Matrix4 | null {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return null

    modelInfo.model.object.updateMatrixWorld(true)
    return modelInfo.model.object.matrixWorld.clone()
  }

  setPosition(id: string, position: THREE.Vector3): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return false

    modelInfo.model.object.position.copy(position)
    modelInfo.model.object.updateMatrixWorld(true)

    this.onModelTransformed.trigger(modelInfo)
    return true
  }

  /**
   * Translate (offset) the model relative to its current position.
   */
  translate(id: string, delta: THREE.Vector3): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return false

    modelInfo.model.object.position.add(delta)
    modelInfo.model.object.updateMatrixWorld(true)

    this.onModelTransformed.trigger(modelInfo)
    return true
  }

  /**
   * Set the absolute rotation of the model.
   */
  setRotation(id: string, rotation: THREE.Euler): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return false

    modelInfo.model.object.rotation.copy(rotation)
    modelInfo.model.object.updateMatrixWorld(true)

    this.onModelTransformed.trigger(modelInfo)
    return true
  }

  /**
   * Reset position, rotation, and scale to identity (origin, no rotation, unit scale).
   */
  resetTransform(id: string): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return false

    modelInfo.model.object.position.set(0, 0, 0)
    modelInfo.model.object.rotation.set(0, 0, 0)
    modelInfo.model.object.scale.set(1, 1, 1)
    modelInfo.model.object.updateMatrixWorld(true)

    this.onModelTransformed.trigger(modelInfo)
    return true
  }

  // ---------------------------------------------------------------------------
  // Visibility
  // ---------------------------------------------------------------------------

  /**
   * Show or hide the model.
   */
  setVisibility(id: string, visible: boolean): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return false

    modelInfo.model.object.visible = visible
    return true
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  dispose(): void {
    this._models.clear()
  }
}
