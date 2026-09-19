// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { upAxisQuaternion } from '../pointcloud/pointCloudTransform'

import type { PointCloudPlacement, PointCloudSourceUp } from '../pointcloud/pointCloudPlacement'

/** A splat's stored placement. Same shape and same column as a point cloud's. */
export type SplatPlacement = PointCloudPlacement

export const DEFAULT_SPLAT_PLACEMENT: SplatPlacement = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
  sourceUp: 'y',
}

/**
 * Levels a splat onto the scene's Y-up. `'y'` means Y-**down** here: the common 3DGS
 * training pipelines export flipped, which is why Spark's own examples rotate by pi.
 */
export function splatUpFixQuaternion(sourceUp: PointCloudSourceUp): THREE.Quaternion {
  if (sourceUp === 'z') return upAxisQuaternion('z')
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0))
}

export function applySplatUpAxis(object: THREE.Object3D, sourceUp: PointCloudSourceUp): void {
  object.quaternion.copy(splatUpFixQuaternion(sourceUp))
}
