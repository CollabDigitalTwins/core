// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { placementFromPivotDrag, placementWithPivot } from '../pointcloud/pointCloudPivot'
import { samePlacement } from '../pointcloud/pointCloudPlacement'
import { objectToPlacement } from '../pointcloud/pointCloudTransform'

import { createPlacementEvent } from './placementEvent'
import { narrowPlacement } from './placementTarget'
import { uniformScale } from './uniformScale'

import type { PlacementEvent } from './placementEvent'
import type { PlacementCapabilities, PlacementMode, PlacementTarget } from './placementTarget'
import type { PointCloudPlacement } from '../pointcloud/pointCloudPlacement'

const PIVOT_PROXY_NAME = 'placement-pivot'

/** The slice of a transform gizmo the core needs, so a session tests without WebGL. */
export interface PlacementGizmo {
  attach(object: THREE.Object3D): boolean
  detach(): void
  dispose(): void
  setMode(mode: PlacementMode): void
  onAccept?: () => void
  onCancel?: () => void
  onChange?: () => void
}

/** A tool that gives up the viewer when something else claims it. */
export interface PlacementExclusiveTool {
  deactivate(): Promise<void> | void
}

/** Single-slot mutual exclusion, so only one tool drives the viewer at a time. */
export interface PlacementCoordinator {
  claim(tool: PlacementExclusiveTool): Promise<void> | void
  release(tool: PlacementExclusiveTool): void
}

export interface PlacementCoreSetup {
  createGizmo: () => PlacementGizmo
  coordinator?: PlacementCoordinator | null
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
  /** Whether the write reached storage. Absent until the commit settles. */
  ok?: boolean
}

/**
 * One in-session placement edit. The gizmo, the numeric card and storage all drive the same
 * target, and the target is the only thing that knows how its kind persists.
 */
export class PlacementCore implements PlacementExclusiveTool {
  readonly onChanged: PlacementEvent<PlacementState | null>
  readonly onCommitted: PlacementEvent<PlacementState>

  private coordinator: PlacementCoordinator | null = null
  private createGizmo: (() => PlacementGizmo) | null = null
  private pickPoint: (() => Promise<THREE.Vector3 | null>) | null = null

  private gizmo: PlacementGizmo | null = null
  private target: PlacementTarget | null = null
  private snapshot: PointCloudPlacement | null = null
  private pivotPoint: THREE.Vector3 | null = null
  /** Gizmo target while a pivot is set, so the handles sit on the pivot and not the target root. */
  private proxy: THREE.Object3D | null = null
  private proxyBase: PointCloudPlacement | null = null
  private draggingProxy = false
  /** A gizmo attach always starts in translate, so the live mode has to be re-applied. */
  private currentMode: PlacementMode = 'translate'

  constructor(createEvent: <T>() => PlacementEvent<T> = createPlacementEvent) {
    this.onChanged = createEvent<PlacementState | null>()
    this.onCommitted = createEvent<PlacementState>()
  }

  setup(config: PlacementCoreSetup) {
    this.end()
    this.coordinator = config.coordinator ?? null
    this.createGizmo = config.createGizmo
    this.pickPoint = config.pickPoint ?? null
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
    if (!this.createGizmo) return false
    if (!target.object()) return false
    if (this.target?.id === target.id) {
      this.setMode(mode)
      return true
    }

    this.end()
    await this.coordinator?.claim(this)

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

  async accept() {
    const target = this.target
    if (!target) return

    const placement = this.placement()
    const stored = placement && narrowPlacement(placement, target.capabilities)
    const before = this.snapshot && narrowPlacement(this.snapshot, target.capabilities)
    // A Done that moved nothing must not write, or claim to have written.
    const changed = !!stored && (!before || !samePlacement(stored, before))
    const committed = stored && changed
      ? { id: target.id, name: target.name, capabilities: target.capabilities, mode: this.currentMode, placement, pivot: this.pivot }
      : null

    const coordinator = this.coordinator
    this.end()
    coordinator?.release(this)
    this.onChanged.trigger(null)

    if (!committed || !stored) return

    let ok = true
    try {
      await target.commit(stored)
    } catch (error) {
      ok = false
      console.warn(`[placement ${target.id}] was not saved:`, error)
    }
    this.onCommitted.trigger({ ...committed, ok })
  }

  async cancel() {
    const target = this.target
    if (!target || this.snapshot === null) return
    target.apply(this.snapshot)
    await this.accept()
  }

  /** Another tool took the viewer, so keep the edit and let go. */
  deactivate() {
    if (!this.target) return
    this.end()
    this.onChanged.trigger(null)
  }

  dispose() {
    this.end()
    this.onChanged.reset()
    this.onCommitted.reset()
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
    this.gizmo.onAccept = () => { void this.accept() }
    this.gizmo.onCancel = () => { void this.cancel() }

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
}
