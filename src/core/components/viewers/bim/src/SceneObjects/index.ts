// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { CurrentWorld } from '../CurrentWorld'

import { SceneObjectRegistry } from './sceneObjectRegistry'

export type { SceneObject, SceneObjectInput, SceneObjectKind } from './sceneObjectRegistry'
export { SceneObjectRegistry, sceneObjectName } from './sceneObjectRegistry'

/** Reaches the scene registry the way React reaches every other viewer service. */
export class BimSceneObjects extends OBC.Component {
  static uuid = 'b1e0f6d2-6a41-4a4e-9e7f-2c5a1d0b7e34' as const

  enabled = true

  private _registry: SceneObjectRegistry | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(BimSceneObjects.uuid, this)
  }

  /** null only before the world exists; the scene is stable once it does. */
  get registry(): SceneObjectRegistry | null {
    if (this._registry) return this._registry

    const scene = this.components.get(CurrentWorld).world?.scene?.three
    if (!scene) return null

    this._registry = new SceneObjectRegistry({ scene })
    return this._registry
  }

  dispose(): void {
    this._registry?.clear()
    this._registry = null
  }
}
