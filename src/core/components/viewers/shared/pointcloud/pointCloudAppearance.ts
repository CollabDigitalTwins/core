// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import type { PointCloudMaterialLike } from './pointCloudLoader'

export const POINT_SIZE_TYPES = ['fixed', 'attenuated', 'adaptive'] as const
export const POINT_SHAPES = ['square', 'circle', 'paraboloid'] as const

export type PointSizeType = (typeof POINT_SIZE_TYPES)[number]
export type PointShape = (typeof POINT_SHAPES)[number]

/** How a cloud is drawn. One set per viewer, applied to every loaded cloud. */
export interface PointCloudAppearance {
  pointBudget: number
  size: number
  minSize: number
  maxSize: number
  opacity: number
  sizeType: PointSizeType
  shape: PointShape
}

export const DEFAULT_APPEARANCE: PointCloudAppearance = {
  pointBudget: 1_000_000,
  size: 1,
  minSize: 2,
  maxSize: 12,
  opacity: 1,
  sizeType: 'adaptive',
  shape: 'circle',
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** Keeps a partial update inside what the shader can render, so a bad input cannot blank the view. */
export function normalizeAppearance(
  current: PointCloudAppearance,
  patch: Partial<PointCloudAppearance>,
): PointCloudAppearance {
  const next = { ...current, ...patch }
  const minSize = clamp(Number.isFinite(next.minSize) ? next.minSize : current.minSize, 0, 100)

  return {
    pointBudget: Math.round(clamp(Number.isFinite(next.pointBudget) ? next.pointBudget : current.pointBudget, 100_000, 20_000_000)),
    size: clamp(Number.isFinite(next.size) ? next.size : current.size, 0.01, 20),
    opacity: clamp(Number.isFinite(next.opacity) ? next.opacity : current.opacity, 0, 1),
    minSize,
    maxSize: clamp(Number.isFinite(next.maxSize) ? next.maxSize : current.maxSize, minSize, 100),
    sizeType: POINT_SIZE_TYPES.includes(next.sizeType) ? next.sizeType : current.sizeType,
    shape: POINT_SHAPES.includes(next.shape) ? next.shape : current.shape,
  }
}

export function applyAppearance(material: PointCloudMaterialLike, appearance: PointCloudAppearance) {
  material.pointColorType = 0
  material.pointSizeType = POINT_SIZE_TYPES.indexOf(appearance.sizeType)
  material.shape = POINT_SHAPES.indexOf(appearance.shape)
  material.size = appearance.size
  material.minSize = appearance.minSize
  material.maxSize = appearance.maxSize
  material.opacity = appearance.opacity
  // potree-core's linear output path multiplies every channel by 12.92, so keep encodings matched.
  material.outputColorEncoding = material.inputColorEncoding
  applyRenderState(material, appearance)
  material.needsUpdate = true
}

/** Undoes the additive, depth-test-off splat mode potree re-derives from opacity on every
 *  shader rebuild. Re-assert after anything that can rebuild. */
export function applyRenderState(material: PointCloudMaterialLike, appearance: PointCloudAppearance) {
  material.transparent = appearance.opacity < 1
  material.blending = THREE.NormalBlending
  material.depthTest = true
}
