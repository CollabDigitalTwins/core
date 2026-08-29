// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { applyAppearance, DEFAULT_APPEARANCE } from './pointCloudAppearance'

import type { PointCloudAppearance } from './pointCloudAppearance'
import type { PointCloudEngine, PointCloudOctreeLike } from './pointCloudRegistry'
import type * as THREE from 'three'

type PotreeCtor = {
  new (): PotreeLike
  pick(
    clouds: PointCloudOctreeLike[],
    renderer: unknown,
    camera: THREE.Camera,
    ray: THREE.Ray,
    params?: { pickWindowSize?: number },
  ): { position?: THREE.Vector3 } | null
}

type PotreeLike = {
  pointBudget: number
  loadPointCloud(fileName: string, baseUrl: string): Promise<PointCloudOctreeLike>
  updatePointClouds(
    clouds: PointCloudOctreeLike[],
    camera: THREE.Camera,
    renderer: unknown,
  ): { numVisiblePoints: number; exceededMaxLoadsToGPU: boolean; nodeLoadPromises: unknown[] }
}

// three ships no declarations here, so potree-core's classes extend `any` and lose their members.
export interface PointCloudMaterialLike {
  size: number
  minSize: number
  maxSize: number
  pointSizeType: number
  pointColorType: number
  shape: number
  inputColorEncoding: number
  outputColorEncoding: number
  opacity: number
  transparent: boolean
  blending: number
  depthTest: boolean
  clippingPlanes: readonly THREE.Plane[]
  clipMode: number
  needsUpdate: boolean
  syncClippingPlanes: () => void
  updateShaderSource: () => void
}

export function pointCloudMaterial(octree: PointCloudOctreeLike): PointCloudMaterialLike {
  return (octree as unknown as { material: PointCloudMaterialLike }).material
}

/**
 * potree-core behind the framework-free `PointCloudEngine` port. The only module in
 * the codebase that imports it, so every other layer stays testable without WebGL.
 */
export function createPotreeEngine(appearance: PointCloudAppearance = DEFAULT_APPEARANCE): PointCloudEngine {
  let potree: PotreeLike | null = null
  let Potree: PotreeCtor | null = null

  const engine: PointCloudEngine = {
    pointBudget: appearance.pointBudget,

    async load(fileName, baseUrl) {
      if (!potree) {
        Potree = (await import('potree-core')).Potree as unknown as PotreeCtor
        potree = new Potree()
      }
      potree.pointBudget = engine.pointBudget

      const octree = await potree.loadPointCloud(fileName, baseUrl)
      applyAppearance(pointCloudMaterial(octree), appearance)
      return octree
    },

    update(clouds, camera, renderer) {
      if (!potree || clouds.length === 0) return { numVisiblePoints: 0, streaming: false }
      potree.pointBudget = engine.pointBudget
      const result = potree.updatePointClouds(clouds, camera, renderer)
      return {
        numVisiblePoints: result?.numVisiblePoints ?? 0,
        streaming: (result?.exceededMaxLoadsToGPU ?? false) || (result?.nodeLoadPromises?.length ?? 0) > 0,
      }
    },

    pick(clouds, camera, renderer, ray, pickWindowSize) {
      if (!Potree || clouds.length === 0) return null
      return Potree.pick(clouds, renderer, camera, ray, { pickWindowSize })?.position ?? null
    },

    dispose() {
      potree = null
      Potree = null
    },
  }

  return engine
}
