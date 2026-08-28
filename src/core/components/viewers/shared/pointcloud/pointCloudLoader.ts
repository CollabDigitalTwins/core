// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PointCloudEngine, PointCloudOctreeLike } from './pointCloudRegistry'
import type * as THREE from 'three'

export const DEFAULT_POINT_BUDGET = 1_000_000

type PotreeLike = {
  pointBudget: number
  loadPointCloud(fileName: string, baseUrl: string): Promise<PointCloudOctreeLike>
  updatePointClouds(
    clouds: PointCloudOctreeLike[],
    camera: THREE.Camera,
    renderer: unknown,
  ): { numVisiblePoints: number; exceededMaxLoadsToGPU: boolean }
}

// three ships no declarations here, so potree-core's classes extend `any` and lose their members.
export interface PointCloudMaterialLike {
  size: number
  pointSizeType: number
  pointColorType: number
  shape: number
  clippingPlanes: unknown
  needsUpdate: boolean
}

export function pointCloudMaterial(octree: PointCloudOctreeLike): PointCloudMaterialLike {
  return (octree as unknown as { material: PointCloudMaterialLike }).material
}

/** Adaptive size, circular points, RGB colour — the v1 look agreed in the plan. */
function applyDefaultStyle(octree: PointCloudOctreeLike) {
  const material = pointCloudMaterial(octree)
  material.pointColorType = 0
  material.pointSizeType = 2
  material.shape = 1
  material.size = 1
  material.needsUpdate = true
}

/**
 * potree-core behind the framework-free `PointCloudEngine` port. The only module in
 * the codebase that imports it, so every other layer stays testable without WebGL.
 */
export function createPotreeEngine(pointBudget = DEFAULT_POINT_BUDGET): PointCloudEngine {
  let potree: PotreeLike | null = null

  const engine: PointCloudEngine = {
    pointBudget,

    async load(fileName, baseUrl) {
      if (!potree) {
        const { Potree } = await import('potree-core')
        potree = new Potree() as unknown as PotreeLike
      }
      potree.pointBudget = engine.pointBudget

      const octree = await potree.loadPointCloud(fileName, baseUrl)
      applyDefaultStyle(octree)
      return octree
    },

    update(clouds, camera, renderer) {
      if (!potree || clouds.length === 0) return { numVisiblePoints: 0, pendingGpuLoads: false }
      potree.pointBudget = engine.pointBudget
      const result = potree.updatePointClouds(clouds, camera, renderer)
      return {
        numVisiblePoints: result?.numVisiblePoints ?? 0,
        pendingGpuLoads: result?.exceededMaxLoadsToGPU ?? false,
      }
    },

    dispose() {
      potree = null
    },
  }

  return engine
}
