// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import * as THREE from 'three'

import { placementFromPivotDrag, placementWithPivot } from '../../../shared/pointcloud/pointCloudPivot'
import { objectToPlacement } from '../../../shared/pointcloud/pointCloudTransform'
import { GizmoController } from '../../utils/GizmoController'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'

import { BimPointClouds } from './index'

import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'
import type { LoadedPointCloud } from '../../../shared/pointcloud/pointCloudRegistry'
import type { ExclusiveViewTool } from '../lib/ViewModeCoordinator'

export type AlignmentMode = 'translate' | 'rotate' | 'scale'

/** Same window the measurement tools use, so a sparse cloud is still clickable. */
const PIVOT_PICK_WINDOW_PX = 17

const PIVOT_PROXY_NAME = 'pointcloud-pivot'

function nearestTo(
  origin: THREE.Vector3,
  ...points: (THREE.Vector3 | null)[]
): THREE.Vector3 | null {
  let nearest: THREE.Vector3 | null = null
  for (const point of points) {
    if (!point) continue
    if (!nearest || origin.distanceToSquared(point) < origin.distanceToSquared(nearest)) nearest = point
  }
  return nearest
}

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
  pick?(ray: THREE.Ray, camera: THREE.Camera, thresholdPx: number): { point: THREE.Vector3 } | null
}

export interface PointCloudAlignmentSetup {
  world: OBC.World
  clouds?: AlignablePointClouds
  coordinator?: ViewModeCoordinator
  createGizmo?: () => AlignmentGizmo
  /** Resolves the world point under the cursor. Injected so the session tests without WebGL. */
  pickPoint?: () => Promise<THREE.Vector3 | null>
}

export interface AlignmentState {
  id: string
  placement: PointCloudPlacement
  /** What rotation and scale turn about, or null for the cloud's own origin. */
  pivot: THREE.Vector3 | null
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
  private pickPoint: (() => Promise<THREE.Vector3 | null>) | null = null
  private world: OBC.World | null = null

  private gizmo: AlignmentGizmo | null = null
  private id: string | null = null
  private snapshot: PointCloudPlacement | null = null
  private pivotPoint: THREE.Vector3 | null = null
  /** Gizmo target while a pivot is set, so the handles sit on the pivot and not the cloud root. */
  private proxy: THREE.Object3D | null = null
  private proxyBase: PointCloudPlacement | null = null
  private draggingProxy = false
  /** GizmoController.attach always starts in translate, so the live mode has to be re-applied. */
  private mode: AlignmentMode = 'translate'

  constructor(components: OBC.Components) {
    super(components)
    components.add(PointCloudAlignment.uuid, this)
  }

  setup(config: PointCloudAlignmentSetup) {
    this.end()
    this.world = config.world
    this.clouds = config.clouds ?? this.components.get(BimPointClouds)
    this.coordinator = config.coordinator ?? this.components.get(ViewModeCoordinator)
    this.createGizmo = config.createGizmo ?? (() => new GizmoController(config.world))
    this.pickPoint = config.pickPoint ?? (() => this.pickWorldPointOnDoubleClick())
  }

  get activeId(): string | null {
    return this.id
  }

  placement(): PointCloudPlacement | null {
    return this.id === null ? null : this.clouds?.get(this.id)?.placement ?? null
  }

  get pivot(): THREE.Vector3 | null {
    return this.pivotPoint?.clone() ?? null
  }

  /** Sets what rotation and scale turn about; null goes back to the cloud's own origin. */
  setPivot(point: THREE.Vector3 | null) {
    this.pivotPoint = point?.clone() ?? null
    this.reattachGizmo()
    this.publish()
  }

  /** Waits for a double-click in the scene. False when nothing was hit, or the user cancelled. */
  async pickPivot(): Promise<boolean> {
    if (this.id === null || !this.pickPoint) return false

    const point = await this.pickPoint()
    if (!point || this.id === null) return false

    this.setPivot(point)
    return true
  }

  async begin(id: string): Promise<boolean> {
    const cloud = this.clouds?.get(id)
    if (!cloud || !this.coordinator || !this.createGizmo) return false
    if (this.id === id) return true

    this.end()
    await this.coordinator.claim(this)

    this.id = id
    this.mode = 'translate'
    this.snapshot = { ...cloud.placement }
    this.reattachGizmo()
    this.publish()
    return true
  }

  setMode(mode: AlignmentMode) {
    this.mode = mode
    this.gizmo?.setMode(mode)
  }

  setPlacement(placement: PointCloudPlacement) {
    if (this.id === null || !this.clouds) return

    const current = this.clouds.get(this.id)?.placement
    const next = current ? placementWithPivot(current, placement, this.pivotPoint) : placement

    this.clouds.setPlacement(this.id, next)
    this.clouds.refresh()
    // A panel edit invalidates the drag the proxy is measuring against.
    if (!this.draggingProxy) this.resetProxy()
    this.publish()
  }

  accept() {
    if (this.id === null) return
    const committed = { id: this.id, placement: this.placement(), pivot: this.pivot }
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
    this.removeProxy()
    this.id = null
    this.snapshot = null
    this.pivotPoint = null
  }

  /** Rebuilds the gizmo on whichever object the handles should sit on. */
  private reattachGizmo() {
    const cloud = this.id === null ? undefined : this.clouds?.get(this.id)
    if (!cloud || !this.createGizmo) return

    this.gizmo?.dispose()
    this.removeProxy()

    this.gizmo = this.createGizmo()
    this.gizmo.onChange = this.onGizmoChange
    this.gizmo.onAccept = () => this.accept()
    this.gizmo.onCancel = () => this.cancel()

    if (!this.pivotPoint) {
      this.gizmo.attach(cloud.root)
      this.gizmo.setMode(this.mode)
      return
    }

    const proxy = new THREE.Object3D()
    proxy.name = PIVOT_PROXY_NAME
    proxy.position.copy(this.pivotPoint)
    cloud.root.parent?.add(proxy)
    this.proxy = proxy
    this.proxyBase = { ...cloud.placement }
    this.gizmo.attach(proxy)
    this.gizmo.setMode(this.mode)
  }

  /** Puts the proxy back on the pivot, so the next drag measures from where the cloud now is. */
  private resetProxy() {
    const cloud = this.id === null ? undefined : this.clouds?.get(this.id)
    if (!this.proxy || !this.pivotPoint || !cloud) return

    this.proxy.position.copy(this.pivotPoint)
    this.proxy.quaternion.identity()
    this.proxy.scale.setScalar(1)
    this.proxyBase = { ...cloud.placement }
  }

  private removeProxy() {
    this.proxy?.removeFromParent()
    this.proxy = null
    this.proxyBase = null
  }

  private readonly onGizmoChange = () => {
    const cloud = this.id === null ? undefined : this.clouds?.get(this.id)
    if (!cloud || this.id === null || !this.clouds) return

    if (this.proxy && this.proxyBase && this.pivotPoint) {
      const dragged = placementFromPivotDrag(this.proxyBase, this.pivotPoint, {
        position: this.proxy.position.clone(),
        quaternion: this.proxy.quaternion.clone(),
        scale: this.proxy.scale.x,
      })
      this.draggingProxy = true
      this.setPlacement(dragged)
      this.draggingProxy = false
      return
    }

    this.clouds.setPlacement(this.id, objectToPlacement(cloud.root, cloud.placement.sourceUp))
    this.clouds.refresh()
    this.publish()
  }

  private publish() {
    const placement = this.placement()
    if (this.id === null || !placement) return
    this.onChanged.trigger({ id: this.id, placement, pivot: this.pivot })
  }

  /** Nearest of the fragment snap and the point-cloud hit under the cursor. */
  private pickWorldPointOnDoubleClick(): Promise<THREE.Vector3 | null> {
    const canvas = this.world?.renderer?.three.domElement
    if (!canvas) return Promise.resolve(null)

    return new Promise((resolve) => {
      const done = (point: THREE.Vector3 | null) => {
        canvas.removeEventListener('dblclick', onDoubleClick)
        window.removeEventListener('keydown', onKeyDown)
        resolve(point)
      }
      const onDoubleClick = () => { void this.castAtCursor().then(done) }
      const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') done(null) }

      canvas.addEventListener('dblclick', onDoubleClick)
      window.addEventListener('keydown', onKeyDown)
    })
  }

  /** Nearest of the fragment snap and the point-cloud hit under the cursor. */
  private async castAtCursor(): Promise<THREE.Vector3 | null> {
    const world = this.world
    if (!world) return null

    const caster = this.components.get(OBC.Raycasters).get(world)
    const camera = world.camera.three

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(caster.mouse.position, camera)
    const cloudHit = this.clouds?.pick?.(raycaster.ray, camera, PIVOT_PICK_WINDOW_PX)?.point ?? null

    const fragmentHit = (await caster.castRay({ items: [] }))?.point ?? null

    return nearestTo(raycaster.ray.origin, cloudHit, fragmentHit)
  }
}
