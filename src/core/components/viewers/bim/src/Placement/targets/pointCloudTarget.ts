// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { placementPatch, samePlacement } from '../../PointClouds/pointCloudPlacementStore'
import { FULL_PLACEMENT } from '../placementTarget'

import type { DbFile } from '../../../../../../types/dbTypes'
import type { PointCloudPlacement } from '../../../../shared/pointcloud/pointCloudPlacement'
import type { BimPointClouds } from '../../PointClouds'
import type { PlacementTarget } from '../placementTarget'
import type * as THREE from 'three'

export interface PointCloudTargetSetup {
  id: string
  name: string
  clouds: BimPointClouds
  updateFile: (patch: Partial<DbFile>) => Promise<unknown>
  /** What is already stored, so an accept that moved nothing does not write. */
  storedPlacement?: () => PointCloudPlacement
}

/** Placement for a loaded point cloud. The only kind that can store a full transform. */
export function pointCloudTarget({ id, name, clouds, updateFile, storedPlacement }: PointCloudTargetSetup): PlacementTarget {
  return {
    id,
    name,
    capabilities: FULL_PLACEMENT,
    object: (): THREE.Object3D | null => clouds.get(id)?.root ?? null,
    read: (): PointCloudPlacement => clouds.get(id)?.placement as PointCloudPlacement,
    apply: (placement) => {
      clouds.setPlacement(id, placement)
      clouds.refresh()
    },
    bounds: () => clouds.worldCentroid(id),
    commit: async (placement) => {
      const stored = storedPlacement?.()
      if (stored && samePlacement(placement, stored)) return
      await updateFile(placementPatch(placement))
    },
  }
}
