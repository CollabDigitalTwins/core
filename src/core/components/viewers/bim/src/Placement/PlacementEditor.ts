// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { placementFromPivotDrag, placementWithPivot } from '../../../shared/pointcloud/pointCloudPivot'
import { objectToPlacement } from '../../../shared/pointcloud/pointCloudTransform'
import { GizmoController } from '../../utils/GizmoController'
import { pickNearest, SCENE_PICK_WINDOW_PX } from '../lib/scenePicker'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'

import { narrowPlacement } from './placementTarget'
import { uniformScale } from './uniformScale'

import type { PlacementCapabilities, PlacementTarget } from './placementTarget'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'
import type { ScenePickSource } from '../lib/scenePicker'
import type { ExclusiveViewTool } from '../lib/ViewModeCoordinator'

export type PlacementMode = 'translate' | 'rotate' | 'scale'

const PIVOT_PROXY_NAME = 'placement-pivot'

/** The slice of `GizmoController` the editor needs, so a session tests without WebGL. */
export interface PlacementGizmo {
  attach(object: THREE.Object3D): boolean
  detach(): void
  dispose(): void
  setMode(mode: PlacementMode): void
  onAccept?: () => void
  onCancel?: () => void
  onChange?: () => void
}

export interface PlacementEditorSetup {
  world: OBC.World
  coordinator?: ViewModeCoordinator
  createGizmo?: () => PlacementGizmo
  /** Extra pick sources for the pivot, e.g. point clouds the raycaster cannot see. */
  pickSources?: () => Iterable<ScenePickSource>
  /** Resolves the world point under the cursor. Injected so a session tests without WebGL. */
  pickPoint?: () => Promise<THREE.Vector3 | null>
}

export interface PlacementState {
  id: string
  name: string
  capabilities: PlacementCapabilities
  mode: PlacementMode
  placement: PointCloudPlacement
  /** What rotation and scale turn about, or null for the target's own origin. */
  pivot: THREE.Vector3 | null
}

/**
 * One in-session placement edit. The gizmo, the numeric card and storage all drive the same
 * target, and the target is the only thing that knows how its kind persists.
 */
export class PlacementEditor extends OBC.Component implements OBC.Disposable, ExclusiveViewTool {
  static uuid = 'd47b9e2a-3f61-4c8d-b0a5-6e91c72f4d18' as const

  enabled = true

  readonly onChanged = new OBC.Event<PlacementState | null>()
  readonly onCommitted = new OBC.Event<PlacementState>()
  readonly onDisposed = new OBC.Event()

  private coordinator: ViewModeCoordinator | null = null
  private createGizmo: (() => PlacementGizmo) | null = null
  private pickPoint: (() => Promise<THREE.Vector3 | null>) | null = null
  private pickSources: (() => Iterable<ScenePickSource>) | null = null
  private world: OBC.World | null = null

  private gizmo: PlacementGizmo | null = null
  private target: PlacementTarget | null = null
  private snapshot: PointCloudPlacement | null = null
  private pivotPoint: THREE.Vector3 | null = null
  /** Gizmo target while a pivot is set, so the handles sit on the pivot and not the target root. */
  private proxy: THREE.Object3D | null = null
  private proxyBase: PointCloudPlacement | null = null
  private draggingProxy = false
  /** GizmoController.attach always starts in translate, so the live mode has to be re-applied. */
  private currentMode: PlacementMode = 'translate'

  constructor(components: OBC.Components) {
    super(components)
    components.add(PlacementEditor.uuid, this)
  }

  setup(config: PlacementEditorSetup) {
    this.end()
    this.world = config.world
    this.coordinator = config.coordinator ?? this.components.get(ViewModeCoordinator)
    this.createGizmo = config.createGizmo ?? (() => new GizmoController(config.world))
    this.pickSources = config.pickSources ?? (() => [])
    this.pickPoint = config.pickPoint ?? (() => this.pickWorldPointOnDoubleClick())
  }

  get activeId(): string | null {
    return this.target?.id ?? null
  }

  get activeTarget(): PlacementTarget | null {
    return this.target
  }

  get mode(): PlacementMode {
    return this.currentMode
  }

  get capabilities(): PlacementCapabilities | null {
    return this.target?.capabilities ?? null
  }

  placement(): PointCloudPlacement | null {
    return this.target?.read() ?? null
  }

  get pivot(): THREE.Vector3 | null {
    return this.pivotPoint?.clone() ?? null
  }

  /** Sets what rotation and scale turn about; null goes back to the target's own origin. */
  setPivot(point: THREE.Vector3 | null) {
    this.pivotPoint = point?.clone() ?? null
    this.reattachGizmo()
    this.publish()
  }

  /** Waits for a double-click in the scene. False when nothing was hit, or the user cancelled. */
  async pickPivot(): Promise<boolean> {
    if (!this.target || !this.pickPoint) return false

    const point = await this.pickPoint()
    if (!point || !this.target) return false

    this.setPivot(point)
    return true
  }

  async begin(target: PlacementTarget, mode: PlacementMode = 'translate'): Promise<boolean> {
    if (!this.coordinator || !this.createGizmo) return false
    if (!target.object()) return false
    if (this.target?.id === target.id) {
      this.setMode(mode)
      return true
    }

    this.end()
    await this.coordinator.claim(this)

    this.target = target
    this.currentMode = mode
    this.snapshot = { ...target.read() }
    this.reattachGizmo()
    this.publish()
    return true
  }

  setMode(mode: PlacementMode) {
    this.currentMode = mode
    this.gizmo?.setMode(mode)
    this.publish()
  }

  setPlacement(placement: PointCloudPlacement) {
    const target = this.target
    if (!target) return

    const current = target.read()
    const pivoted = current ? placementWithPivot(current, placement, this.pivotPoint) : placement

    target.apply(narrowPlacement(pivoted, target.capabilities))
    // A card edit invalidates the drag the proxy is measuring against.
    if (!this.draggingProxy) this.resetProxy()
    this.publish()
  }

  /** Puts the target's own centre on the world origin, keeping rotation and scale. */
  centreOnOrigin() {
    const target = this.target
    const centre = target?.bounds()
    if (!target || !centre) return

    const current = target.read()
    const [x, y, z] = current.position
    this.setPlacement({
      ...current,
      position: [x - centre.x, y - centre.y, z - centre.z],
    })
  }

  accept() {
    const target = this.target
    if (!target) return

    const placement = this.placement()
    const committed = placement
      ? { id: target.id, name: target.name, capabilities: target.capabilities, mode: this.currentMode, placement, pivot: this.pivot }
      : null

    const coordinator = this.coordinator
    this.end()
    coordinator?.release(this)

    if (committed) {
      void target.commit(narrowPlacement(committed.placement, committed.capabilities))
      this.onCommitted.trigger(committed)
    }
    this.onChanged.trigger(null)
  }

  cancel() {
    const target = this.target
    if (!target || this.snapshot === null) return
    target.apply(this.snapshot)
    this.accept()
  }

  /** {@link ExclusiveViewTool} — another tool took the viewer, so keep the edit and let go. */
  deactivate() {
    if (!this.target) return
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
    this.target = null
    this.snapshot = null
    this.pivotPoint = null
  }

  /** Rebuilds the gizmo on whichever object the handles should sit on. */
  private reattachGizmo() {
    const root = this.target?.object()
    if (!root || !this.createGizmo) return

    this.gizmo?.dispose()
    this.removeProxy()

    this.gizmo = this.createGizmo()
    this.gizmo.onChange = this.onGizmoChange
    this.gizmo.onAccept = () => this.accept()
    this.gizmo.onCancel = () => this.cancel()

    if (!this.pivotPoint) {
      this.gizmo.attach(root)
      this.gizmo.setMode(this.currentMode)
      return
    }

    const proxy = new THREE.Object3D()
    proxy.name = PIVOT_PROXY_NAME
    proxy.position.copy(this.pivotPoint)
    root.parent?.add(proxy)
    this.proxy = proxy
    this.proxyBase = { ...(this.target?.read() as PointCloudPlacement) }
    this.gizmo.attach(proxy)
    this.gizmo.setMode(this.currentMode)
  }

  /** Puts the proxy back on the pivot, so the next drag measures from where the target now is. */
  private resetProxy() {
    const placement = this.target?.read()
    if (!this.proxy || !this.pivotPoint || !placement) return

    this.proxy.position.copy(this.pivotPoint)
    this.proxy.quaternion.identity()
    this.proxy.scale.setScalar(1)
    this.proxyBase = { ...placement }
  }

  private removeProxy() {
    this.proxy?.removeFromParent()
    this.proxy = null
    this.proxyBase = null
  }

  private readonly onGizmoChange = () => {
    const target = this.target
    const root = target?.object()
    if (!target || !root) return

    if (this.proxy && this.proxyBase && this.pivotPoint) {
      const dragged = placementFromPivotDrag(this.proxyBase, this.pivotPoint, {
        position: this.proxy.position.clone(),
        quaternion: this.proxy.quaternion.clone(),
        scale: uniformScale(this.proxy.scale.x, this.proxy.scale.y, this.proxy.scale.z),
      })
      this.draggingProxy = true
      this.setPlacement(dragged)
      this.draggingProxy = false
      return
    }

    // The gizmo writes only the dragged axis; scaling is proportional, so resolve it to one number.
    root.scale.setScalar(uniformScale(root.scale.x, root.scale.y, root.scale.z))

    const read = objectToPlacement(root, target.read().sourceUp)
    target.apply(narrowPlacement(read, target.capabilities))
    this.publish()
  }

  private publish() {
    const target = this.target
    const placement = this.placement()
    if (!target || !placement) return
    this.onChanged.trigger({
      id: target.id,
      name: target.name,
      capabilities: target.capabilities,
      mode: this.currentMode,
      placement,
      pivot: this.pivot,
    })
  }

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

  /** Nearest of the fragment snap and any extra pick source under the cursor. */
  private async castAtCursor(): Promise<THREE.Vector3 | null> {
    const world = this.world
    if (!world) return null

    const caster = this.components.get(OBC.Raycasters).get(world)
    const camera = world.camera.three

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(caster.mouse.position, camera)
    const sceneHit = pickNearest(this.pickSources?.() ?? [], raycaster.ray, camera, SCENE_PICK_WINDOW_PX)

    const fragmentHit = (await caster.castRay({ items: [] }))?.point ?? null
    if (!sceneHit) return fragmentHit
    if (!fragmentHit) return sceneHit.point

    return raycaster.ray.origin.distanceTo(fragmentHit) <= sceneHit.distance ? fragmentHit : sceneHit.point
  }
}
