// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import {
  applyAppearance,
  applyRenderState,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
} from '../../../shared/pointcloud/pointCloudAppearance'
import { createPotreeEngine, pointCloudMaterial } from '../../../shared/pointcloud/pointCloudLoader'
import { DEFAULT_PLACEMENT } from '../../../shared/pointcloud/pointCloudPlacement'
import { PointCloudRegistry } from '../../../shared/pointcloud/pointCloudRegistry'

import { applyClippingPlanes } from './pointCloudClipping'

import type { PointCloudAppearance } from '../../../shared/pointcloud/pointCloudAppearance'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'
import type {
  LoadedPointCloud,
  PointCloudEngine,
} from '../../../shared/pointcloud/pointCloudRegistry'
import type { PointCloudSource } from '../../../shared/pointcloud/pointCloudSource'
import type { ScenePickSource } from '../lib/scenePicker'
import type * as THREE from 'three'

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

/** Owns the clouds in the BIM scene so they outlive every React panel and die with
 *  `components.dispose()`. React mirrors this; it never owns a cloud. */
export class BimPointClouds extends OBC.Component implements OBC.Disposable, ScenePickSource {
  static uuid = '4cadfb31-e3a6-4962-b5be-c6b03a6523c3' as const

  enabled = true

  readonly onChanged = new OBC.Event<string[]>()
  readonly onAppearanceChanged = new OBC.Event<PointCloudAppearance>()
  readonly onDisposed = new OBC.Event()

  visiblePoints = 0

  private currentAppearance: PointCloudAppearance = { ...DEFAULT_APPEARANCE }
  private world: OBC.World | null = null
  private registry: PointCloudRegistry | null = null
  private engine: PointCloudEngine | null = null
  private requestFrame: (callback: () => void) => number = (callback) => requestAnimationFrame(callback)
  private cancelFrame: (handle: number) => void = (handle) => cancelAnimationFrame(handle)

  private frameHandle = 0
  private settled = SETTLE_FRAMES
  private streaming = false

  constructor(components: OBC.Components) {
    super(components)
    components.add(BimPointClouds.uuid, this)
  }

  setup(config: BimPointCloudsSetup) {
    this.teardownWorld()

    this.world = config.world
    this.engine = config.engine ?? createPotreeEngine(this.currentAppearance)
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
      renderer.onClippingPlanesUpdated.add(this.onClippingPlanesUpdated)
    }
  }

  get appearance(): PointCloudAppearance {
    return { ...this.currentAppearance }
  }

  setAppearance(patch: Partial<PointCloudAppearance>) {
    this.currentAppearance = normalizeAppearance(this.currentAppearance, patch)
    if (this.engine) this.engine.pointBudget = this.currentAppearance.pointBudget
    for (const cloud of this.list()) applyAppearance(pointCloudMaterial(cloud.octree), this.currentAppearance)
    this.refresh()
    this.onAppearanceChanged.trigger(this.appearance)
  }

  async add(id: string, placement: PointCloudPlacement = DEFAULT_PLACEMENT): Promise<LoadedPointCloud | null> {
    if (!this.registry) return null
    const known = this.registry.get(id)
    const cloud = await this.registry.add(id, placement)
    if (known) return cloud

    this.excludeFromShadows(cloud)
    applyAppearance(pointCloudMaterial(cloud.octree), this.currentAppearance)
    this.syncClipping(cloud)
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

  /** {@link ScenePickSource} — lets the measurement tools hit a scan surface without knowing
   *  what a point cloud is. */
  pick(ray: THREE.Ray, camera: THREE.Camera, thresholdPx: number): { point: THREE.Vector3 } | null {
    const renderer = this.world?.renderer
    if (!this.engine || !renderer) return null

    const octrees = this.list().filter((cloud) => cloud.root.visible).map((cloud) => cloud.octree)
    if (octrees.length === 0) return null

    const point = this.engine.pick(octrees, camera, renderer.three, ray, thresholdPx)
    return point ? { point } : null
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
    this.onAppearanceChanged.reset()
    this.onDisposed.trigger()
    this.onDisposed.reset()
  }

  private teardownWorld() {
    this.stopPump()
    const renderer = this.world?.renderer
    if (renderer) {
      renderer.onBeforeUpdate.remove(this.onBeforeUpdate)
      renderer.onClippingPlanesUpdated.remove(this.onClippingPlanesUpdated)
    }
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

  private readonly onClippingPlanesUpdated = () => {
    for (const cloud of this.list()) this.syncClipping(cloud)
    this.refresh()
  }

  private syncClipping(cloud: LoadedPointCloud) {
    const planes = this.world?.renderer?.clippingPlanes
    if (!planes) return
    applyClippingPlanes(pointCloudMaterial(cloud.octree), planes)
  }

  private readonly onBeforeUpdate = () => {
    const clouds = this.list()
    if (!this.world || !this.engine || clouds.length === 0) return

    const renderer = this.world.renderer
    if (!renderer) return

    const result = this.engine.update(
      clouds.map((cloud) => cloud.octree),
      this.world.camera.three,
      renderer.three,
    )
    for (const cloud of clouds) applyRenderState(pointCloudMaterial(cloud.octree), this.currentAppearance)
    this.visiblePoints = result.numVisiblePoints
    this.streaming = result.streaming
    if (result.streaming) this.refresh()
  }

  // The BIM renderer draws on demand; nothing else asks it to paint a node that just streamed in.
  private readonly pump = () => {
    if (this.streaming || this.settled < SETTLE_FRAMES) {
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
    this.streaming = false
  }
}
