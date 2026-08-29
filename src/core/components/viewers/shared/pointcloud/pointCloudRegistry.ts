// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { DEFAULT_PLACEMENT } from './pointCloudPlacement'
import { applyObjectUpAxis, placementToMatrix } from './pointCloudTransform'

import type { PointCloudPlacement } from './pointCloudPlacement'
import type { PointCloudSource } from './pointCloudSource'

export interface PointCloudOctreeLike extends THREE.Object3D {
  dispose?: () => void
}

/** The rendering engine behind a cloud, injected so the registry can be tested without WebGL. */
export interface PointCloudEngine {
  pointBudget: number
  load(fileName: string, baseUrl: string): Promise<PointCloudOctreeLike>
  update(
    clouds: PointCloudOctreeLike[],
    camera: THREE.Camera,
    renderer: unknown,
  ): { numVisiblePoints: number; streaming: boolean }
  pick(
    clouds: PointCloudOctreeLike[],
    camera: THREE.Camera,
    renderer: unknown,
    ray: THREE.Ray,
    pickWindowSize: number,
  ): THREE.Vector3 | null
  dispose(): void
}

export interface LoadedPointCloud {
  id: string
  name?: string
  root: THREE.Group
  octree: PointCloudOctreeLike
  placement: PointCloudPlacement
}

export function pointCloudRootName(id: string): string {
  return `pointcloud:${id}`
}

export class PointCloudRegistry {
  private readonly scene: THREE.Object3D
  private readonly engine: PointCloudEngine
  private readonly source: PointCloudSource
  private readonly clouds = new Map<string, LoadedPointCloud>()
  private readonly pending = new Map<string, Promise<LoadedPointCloud>>()

  constructor(deps: { scene: THREE.Object3D; engine: PointCloudEngine; source: PointCloudSource }) {
    this.scene = deps.scene
    this.engine = deps.engine
    this.source = deps.source
  }

  async add(id: string, placement: PointCloudPlacement = DEFAULT_PLACEMENT): Promise<LoadedPointCloud> {
    const existing = this.clouds.get(id)
    if (existing) return existing

    const pending = this.pending.get(id)
    if (pending !== undefined) return pending

    const load = this.loadCloud(id, placement)
    this.pending.set(id, load)
    try {
      return await load
    } finally {
      this.pending.delete(id)
    }
  }

  private async loadCloud(id: string, placement: PointCloudPlacement): Promise<LoadedPointCloud> {
    const resolved = await this.source.resolve(id)
    const octree = await this.engine.load(resolved.fileName, resolved.baseUrl)

    const upFix = new THREE.Group()
    applyObjectUpAxis(upFix, placement.sourceUp)
    upFix.add(octree)

    const root = new THREE.Group()
    root.name = pointCloudRootName(id)
    root.add(upFix)

    const loaded: LoadedPointCloud = { id, name: resolved.name, root, octree, placement }
    this.applyPlacement(loaded, placement)
    this.scene.add(root)
    this.clouds.set(id, loaded)
    return loaded
  }

  list(): LoadedPointCloud[] {
    return [...this.clouds.values()]
  }

  get(id: string): LoadedPointCloud | undefined {
    return this.clouds.get(id)
  }

  setPlacement(id: string, placement: PointCloudPlacement): void {
    const cloud = this.clouds.get(id)
    if (!cloud) return
    cloud.placement = placement
    const upFix = cloud.root.children[0]
    if (upFix) applyObjectUpAxis(upFix, placement.sourceUp)
    this.applyPlacement(cloud, placement)
  }

  setVisible(id: string, visible: boolean): void {
    const cloud = this.clouds.get(id)
    if (cloud) cloud.root.visible = visible
  }

  remove(id: string): void {
    const cloud = this.clouds.get(id)
    if (!cloud) return
    this.scene.remove(cloud.root)
    cloud.octree.dispose?.()
    this.clouds.delete(id)
  }

  dispose(): void {
    for (const id of [...this.clouds.keys()]) this.remove(id)
    this.engine.dispose()
  }

  private applyPlacement(cloud: LoadedPointCloud, placement: PointCloudPlacement) {
    placementToMatrix(placement).decompose(cloud.root.position, cloud.root.quaternion, cloud.root.scale)
    cloud.root.updateMatrixWorld(true)
  }
}
