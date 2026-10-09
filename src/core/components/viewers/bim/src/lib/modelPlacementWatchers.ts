// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import type { PlanPoint } from '../FloorplanTool/src/planPointer'

/** A confirmed move or turn of a model, for data a plugin keeps in world plan coordinates on it. */
export interface ModelPlacementChange {
  modelId: string
  /** True when the model turned, not only moved. */
  rotated: boolean
  mapPoint: (point: PlanPoint) => PlanPoint
  /** Metres the model rose; negative when it dropped. */
  elevationChange: number
}

/** What a plugin tells core about the data it keeps on a model, so a move or turn can carry it along. */
export interface ModelPlacementWatcher {
  /** Shown before the model turns; null when none of the plugin's data sits on it. */
  turnWarning: (modelId: string) => string | null
  onPlacementChanged: (change: ModelPlacementChange) => void | Promise<void>
}

export interface TurnConfirmRequest {
  modelName: string
  warnings: string[]
}

const MIN_TURN = 1e-9

/** The change that takes a model placed at `before` to `after`, both its world matrices. */
export function placementChange(modelId: string, before: THREE.Matrix4, after: THREE.Matrix4): ModelPlacementChange {
  const delta = after.clone().multiply(before.clone().invert())
  const e = delta.elements
  return {
    modelId,
    rotated: Math.abs(Math.atan2(e[8], e[0])) > MIN_TURN,
    elevationChange: e[13],
    mapPoint: (point) => {
      const mapped = new THREE.Vector3(point.x, 0, point.z).applyMatrix4(delta)
      return { x: mapped.x, z: mapped.z }
    },
  }
}

/** The plugins following model moves and turns in one BIM viewer, and the dialog that confirms a turn. */
export class ModelPlacementWatchers extends OBC.Component {
  static uuid = '6b1f3c2e-8a4d-4f7b-9e21-5c0d7a9b3e48' as const

  enabled = true

  private readonly watchers = new Set<ModelPlacementWatcher>()
  private confirmTurnWith: ((request: TurnConfirmRequest) => Promise<boolean>) | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(ModelPlacementWatchers.uuid, this)
  }

  watch(watcher: ModelPlacementWatcher): () => void {
    this.watchers.add(watcher)
    return () => { this.watchers.delete(watcher) }
  }

  setTurnConfirmer(confirm: ((request: TurnConfirmRequest) => Promise<boolean>) | null) {
    this.confirmTurnWith = confirm
  }

  /** True when nothing sits on the model, nobody can ask, or the user agreed to turn it. */
  async confirmTurn(modelId: string): Promise<boolean> {
    const warnings = [...this.watchers].map(watcher => watcher.turnWarning(modelId)).filter((w): w is string => !!w)
    if (warnings.length === 0 || !this.confirmTurnWith) return true
    return this.confirmTurnWith({ modelName: modelId, warnings })
  }

  async notify(modelId: string, before: THREE.Matrix4, after: THREE.Matrix4): Promise<void> {
    if (before.equals(after)) return
    const change = placementChange(modelId, before, after)
    await Promise.all([...this.watchers].map(async (watcher) => {
      try { await watcher.onPlacementChanged(change) }
      catch (error) { console.warn(`[ModelPlacementWatchers] a plugin could not follow "${modelId}":`, error) }
    }))
  }
}
