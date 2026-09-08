// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'
import type * as THREE from 'three'

/** What a target can actually persist. The card hides any control outside this. */
export interface PlacementCapabilities {
  rotation: 'yaw' | 'full'
  scale: boolean
}

export const FULL_PLACEMENT: PlacementCapabilities = { rotation: 'full', scale: true }
export const YAW_ONLY_PLACEMENT: PlacementCapabilities = { rotation: 'yaw', scale: false }
// A loaded 3D object may be scaled, but yaw is still the only rotation with a column.
export const SCALABLE_OBJECT_PLACEMENT: PlacementCapabilities = { rotation: 'yaw', scale: true }

/**
 * One thing the placement editor can move. Adapters are the only code that knows how a given
 * kind of target reads and stores its transform.
 */
export interface PlacementTarget {
  id: string
  name: string
  capabilities: PlacementCapabilities
  object(): THREE.Object3D | null
  read(): PointCloudPlacement
  apply(placement: PointCloudPlacement): void
  bounds(): THREE.Vector3 | null
  commit(placement: PointCloudPlacement): Promise<void>
}

/** Strips whatever the target cannot store, so a dropped value never reaches the user as saved. */
export function narrowPlacement(
  placement: PointCloudPlacement,
  capabilities: PlacementCapabilities,
): PointCloudPlacement {
  const [x, yaw, z] = placement.rotation

  return {
    position: [...placement.position],
    rotation: capabilities.rotation === 'full' ? [x, yaw, z] : [0, yaw, 0],
    scale: capabilities.scale ? placement.scale : 1,
    sourceUp: placement.sourceUp,
  }
}
