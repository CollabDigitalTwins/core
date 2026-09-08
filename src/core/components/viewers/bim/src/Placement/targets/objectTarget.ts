// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { DEFAULT_PLACEMENT } from '../../../../shared/pointcloud/pointCloudPlacement'
import { YAW_ONLY_PLACEMENT } from '../placementTarget'

import type { DbFile } from '../../../../../../types/dbTypes'
import type { PlacementCapabilities, PlacementTarget } from '../placementTarget'

export interface ObjectTargetSetup {
  id: string
  name: string
  object: () => THREE.Object3D | null
  updateFile: (patch: Partial<DbFile>) => Promise<unknown>
  /** Defaults to position and yaw only, which is all a fragment model can hold. */
  capabilities?: PlacementCapabilities
}

/**
 * Placement for anything that is one `Object3D` backed by a `DbFile` — a fragment model, a
 * loaded GLB, a DXF group. What it may change is whatever `capabilities` allows.
 */
export function objectTarget({
  id,
  name,
  object,
  updateFile,
  capabilities = YAW_ONLY_PLACEMENT,
}: ObjectTargetSetup): PlacementTarget {
  return {
    id,
    name,
    capabilities,
    object,
    read: () => {
      const root = object()
      if (!root) return { ...DEFAULT_PLACEMENT }
      const { x, y, z } = root.position
      return {
        ...DEFAULT_PLACEMENT,
        position: [x, y, z],
        rotation: [0, root.rotation.y, 0],
        scale: capabilities.scale ? root.scale.x : DEFAULT_PLACEMENT.scale,
      }
    },
    apply: (placement) => {
      const root = object()
      if (!root) return
      root.position.set(...placement.position)
      root.rotation.y = placement.rotation[1]
      if (capabilities.scale) root.scale.setScalar(placement.scale)
      root.updateMatrixWorld(true)
    },
    bounds: () => {
      const root = object()
      if (!root) return null
      const box = new THREE.Box3().setFromObject(root)
      return box.isEmpty() ? null : box.getCenter(new THREE.Vector3())
    },
    commit: async (placement) => {
      const [x, y, z] = placement.position
      await updateFile({ x, y, z, bimRotation: placement.rotation[1] } as Partial<DbFile>)
    },
  }
}
