// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PointCloudMaterialLike } from '../../../shared/pointcloud/pointCloudLoader'
import type * as THREE from 'three'

/** `max_clip_planes` in potree-core's vertex shader; a longer uniform array is silently truncated. */
export const MAX_CLIP_PLANES = 30

export const CLIP_MODE_DISABLED = 0
export const CLIP_MODE_OUTSIDE = 1

/**
 * potree-core evaluates its clip planes against `modelMatrix * position`, so the
 * renderer's world-space planes go in as they are — no cloud-local mapping.
 */
export function applyClippingPlanes(material: PointCloudMaterialLike, planes: readonly THREE.Plane[]) {
  const active = planes.slice(0, MAX_CLIP_PLANES)
  material.clippingPlanes = active
  material.clipMode = active.length === 0 ? CLIP_MODE_DISABLED : CLIP_MODE_OUTSIDE

  // syncClippingPlanes rebuilds before storing the new count, so the define lags one change.
  material.syncClippingPlanes()
  material.updateShaderSource()
}
