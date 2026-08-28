// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { createPotreeEngine } from '../../../shared/pointcloud/pointCloudLoader'
import { DEFAULT_PLACEMENT } from '../../../shared/pointcloud/pointCloudPlacement'
import { PointCloudRegistry } from '../../../shared/pointcloud/pointCloudRegistry'

import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'
import type {
  LoadedPointCloud,
  PointCloudEngine,
} from '../../../shared/pointcloud/pointCloudRegistry'
import type { PointCloudSource } from '../../../shared/pointcloud/pointCloudSource'

/** Frames to keep drawing after the octree settles, so a finished refinement is painted. */
const SETTLE_FRAMES = 20

export interface BimPointCloudsSetup {
  world: OBC.World
  source: PointCloudSource
  engine?: PointCloudEngine
  requestFrame?: (callback: () => void) => number
  cancelFrame?: (handle: number) => void
}

type OnDemandRenderer = OBC.BaseRenderer & { needsUpdate: boolean }

/**
 * Owns the point clouds living in the BIM world's own scene, so they outlive every
 * React panel and are torn down by `components.dispose()`. React mirrors this; it
 * never owns a cloud.
 */
export class BimPointClouds extends OBC.Component implements OBC.Disposable {
  static uuid = '4cadfb31-e3a6-4962-b5be-c6b03a6523c3' as const

  enabled = true

  readonly onChanged = new OBC.Event<string[]>()
  readonly onDisposed = new OBC.Event()

  visiblePoints = 0

  private world: OBC.World | null = null
  private registry: PointCloudRegistry | null = null
  private engine: PointCloudEngine | null = null
  private requestFrame: (callback: () => void) => number = (callback) => requestAnimationFrame(callback)
  private cancelFrame: (handle: number) => void = (handle) => cancelAnimationFrame(handle)

  private frameHandle = 0
  private settled = SETTLE_FRAMES
  private pendingGpuLoads = false
  private updatedThisFrame = false

  constructor(components: OBC.Components) {
    super(components)
    components.add(BimPointClouds.uuid, this)
  }

  setup(config: BimPointCloudsSetup) {
    this.teardownWorld()

    this.world = config.world
    this.engine = config.engine ?? createPotreeEngine()
    this.registry = new PointCloudRegistry({
      scene: config.world.scene.three,
      engine: this.engine,
      source: config.source,
    })
    if (config.requestFrame) this.requestFrame = config.requestFrame
    if (config.cancelFrame) this.cancelFrame = config.cancelFrame

    const renderer = config.world.renderer
    if (renderer) {
      renderer.three.localClippingEnabled = true
      renderer.onBeforeUpdate.add(this.onBeforeUpdate)
    }
  }

  get pointBudget(): number {
    return this.engine?.pointBudget ?? 0
  }

  set pointBudget(budget: number) {
    if (this.engine) this.engine.pointBudget = budget
    this.refresh()
  }

  async add(id: string, placement: PointCloudPlacement = DEFAULT_PLACEMENT): Promise<LoadedPointCloud | null> {
    if (!this.registry) return null
    const known = this.registry.get(id)
    const cloud = await this.registry.add(id, placement)
    if (known) return cloud

    this.excludeFromShadows(cloud)
    this.refresh()
    this.onChanged.trigger(this.ids())
    return cloud
  }

  remove(id: string) {
    const cloud = this.registry?.get(id)
    if (!this.registry || !cloud) return
    this.shadowExclusions()?.delete(cloud.root)
    this.registry.remove(id)
    this.refresh()
    this.onChanged.trigger(this.ids())
  }

  setVisible(id: string, visible: boolean) {
    this.registry?.setVisible(id, visible)
    this.refresh()
  }

  setPlacement(id: string, placement: PointCloudPlacement) {
    this.registry?.setPlacement(id, placement)
    this.refresh()
  }

  get(id: string): LoadedPointCloud | undefined {
    return this.registry?.get(id)
  }

  list(): LoadedPointCloud[] {
    return this.registry?.list() ?? []
  }

  ids(): string[] {
    return this.list().map((cloud) => cloud.id)
  }

  /** Wakes the on-demand renderer so the octree can stream again. */
  refresh() {
    this.settled = 0
    this.startPump()
  }

  dispose() {
    this.teardownWorld()
    this.onChanged.reset()
    this.onDisposed.trigger()
    this.onDisposed.reset()
  }

  private teardownWorld() {
    this.stopPump()
    const renderer = this.world?.renderer
    if (renderer) renderer.onBeforeUpdate.remove(this.onBeforeUpdate)
    this.registry?.dispose()
    this.registry = null
    this.engine = null
    this.world = null
    this.visiblePoints = 0
  }

  private shadowExclusions(): Set<unknown> | undefined {
    const scene = this.world?.scene as unknown as { distanceRenderer?: { excludedObjects: Set<unknown> } }
    return scene?.distanceRenderer?.excludedObjects
  }

  private excludeFromShadows(cloud: LoadedPointCloud) {
    this.shadowExclusions()?.add(cloud.root)
  }

  private readonly onBeforeUpdate = () => {
    // The postproduction composer renders twice per renderer update; potree-core must see one.
    if (this.updatedThisFrame) return
    const clouds = this.list()
    if (!this.world || !this.engine || clouds.length === 0) return

    const renderer = this.world.renderer
    if (!renderer) return

    const result = this.engine.update(
      clouds.map((cloud) => cloud.octree),
      this.world.camera.three,
      renderer.three,
    )
    this.updatedThisFrame = true
    this.visiblePoints = result.numVisiblePoints
    if (this.pendingGpuLoads !== result.pendingGpuLoads) this.settled = 0
    this.pendingGpuLoads = result.pendingGpuLoads
  }

  // The BIM renderer draws on demand; pendingGpuLoads is the only signal that keeps LOD alive.
  private readonly pump = () => {
    this.updatedThisFrame = false
    if (this.pendingGpuLoads || this.settled < SETTLE_FRAMES) {
      this.settled++
      const renderer = this.world?.renderer as OnDemandRenderer | undefined
      if (renderer) renderer.needsUpdate = true
      this.frameHandle = this.requestFrame(this.pump)
      return
    }
    this.frameHandle = 0
  }

  private startPump() {
    if (this.frameHandle !== 0) return
    this.frameHandle = this.requestFrame(this.pump)
  }

  private stopPump() {
    if (this.frameHandle !== 0) this.cancelFrame(this.frameHandle)
    this.frameHandle = 0
    this.settled = SETTLE_FRAMES
    this.pendingGpuLoads = false
  }
}
