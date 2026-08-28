// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { objectToPlacement } from '../../../shared/pointcloud/pointCloudTransform'
import { GizmoController } from '../../utils/GizmoController'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'

import { BimPointClouds } from './index'

import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'
import type { LoadedPointCloud } from '../../../shared/pointcloud/pointCloudRegistry'
import type { ExclusiveViewTool } from '../lib/ViewModeCoordinator'
import type * as THREE from 'three'

export type AlignmentMode = 'translate' | 'rotate' | 'scale'

/** The slice of `GizmoController` alignment needs, so the session tests without WebGL. */
export interface AlignmentGizmo {
  attach(object: THREE.Object3D): boolean
  detach(): void
  dispose(): void
  setMode(mode: AlignmentMode): void
  onAccept?: () => void
  onCancel?: () => void
  onChange?: () => void
}

/** What alignment needs of `BimPointClouds`; the component satisfies it structurally. */
export interface AlignablePointClouds {
  get(id: string): LoadedPointCloud | undefined
  setPlacement(id: string, placement: PointCloudPlacement): void
  refresh(): void
}

export interface PointCloudAlignmentSetup {
  world: OBC.World
  clouds?: AlignablePointClouds
  coordinator?: ViewModeCoordinator
  createGizmo?: () => AlignmentGizmo
}

export interface AlignmentState {
  id: string
  placement: PointCloudPlacement
}

/**
 * One in-session alignment: the gizmo, the numeric panel and the registry all drive
 * the same cloud root. Nothing here persists — PR 4 owns that.
 */
export class PointCloudAlignment extends OBC.Component implements OBC.Disposable, ExclusiveViewTool {
  static uuid = 'b1f0a4d7-5c2e-49a8-9f31-7d0c8e6a2b44' as const

  enabled = true

  readonly onChanged = new OBC.Event<AlignmentState | null>()
  readonly onCommitted = new OBC.Event<AlignmentState>()
  readonly onDisposed = new OBC.Event()

  private clouds: AlignablePointClouds | null = null
  private coordinator: ViewModeCoordinator | null = null
  private createGizmo: (() => AlignmentGizmo) | null = null

  private gizmo: AlignmentGizmo | null = null
  private id: string | null = null
  private snapshot: PointCloudPlacement | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(PointCloudAlignment.uuid, this)
  }

  setup(config: PointCloudAlignmentSetup) {
    this.end()
    this.clouds = config.clouds ?? this.components.get(BimPointClouds)
    this.coordinator = config.coordinator ?? this.components.get(ViewModeCoordinator)
    this.createGizmo = config.createGizmo ?? (() => new GizmoController(config.world))
  }

  get activeId(): string | null {
    return this.id
  }

  placement(): PointCloudPlacement | null {
    return this.id === null ? null : this.clouds?.get(this.id)?.placement ?? null
  }

  async begin(id: string): Promise<boolean> {
    const cloud = this.clouds?.get(id)
    if (!cloud || !this.coordinator || !this.createGizmo) return false
    if (this.id === id) return true

    this.end()
    await this.coordinator.claim(this)

    this.id = id
    this.snapshot = { ...cloud.placement }
    this.gizmo = this.createGizmo()
    this.gizmo.onChange = this.onGizmoChange
    this.gizmo.onAccept = () => this.accept()
    this.gizmo.onCancel = () => this.cancel()
    this.gizmo.attach(cloud.root)
    this.publish()
    return true
  }

  setMode(mode: AlignmentMode) {
    this.gizmo?.setMode(mode)
  }

  setPlacement(placement: PointCloudPlacement) {
    if (this.id === null || !this.clouds) return
    this.clouds.setPlacement(this.id, placement)
    this.clouds.refresh()
    this.publish()
  }

  accept() {
    if (this.id === null) return
    const committed = { id: this.id, placement: this.placement() }
    const coordinator = this.coordinator
    this.end()
    coordinator?.release(this)
    if (committed.placement) this.onCommitted.trigger(committed as AlignmentState)
    this.onChanged.trigger(null)
  }

  cancel() {
    if (this.id === null || this.snapshot === null || !this.clouds) return
    this.clouds.setPlacement(this.id, this.snapshot)
    this.clouds.refresh()
    this.accept()
  }

  /** {@link ExclusiveViewTool} — another tool took the viewer, so keep the edit and let go. */
  deactivate() {
    if (this.id === null) return
    this.end()
    this.onChanged.trigger(null)
  }

  dispose() {
    this.end()
    this.onChanged.reset()
    this.onCommitted.reset()
    this.onDisposed.trigger()
    this.onDisposed.reset()
  }

  private end() {
    this.gizmo?.dispose()
    this.gizmo = null
    this.id = null
    this.snapshot = null
  }

  private readonly onGizmoChange = () => {
    const cloud = this.id === null ? undefined : this.clouds?.get(this.id)
    if (!cloud || this.id === null || !this.clouds) return
    this.clouds.setPlacement(this.id, objectToPlacement(cloud.root, cloud.placement.sourceUp))
    this.clouds.refresh()
    this.publish()
  }

  private publish() {
    const placement = this.placement()
    if (this.id === null || !placement) return
    this.onChanged.trigger({ id: this.id, placement })
  }
}
