// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { sameSplatPlacement, splatPlacementPatch } from '../../Splats/splatPlacementStore'
import { FULL_PLACEMENT } from '../placementTarget'

import type { DbFile } from '../../../../../../types/dbTypes'
import type { SplatPlacement } from '../../../../shared/splat/splatUpAxis'
import type { BimSplats } from '../../Splats'
import type { PlacementTarget } from '../placementTarget'
import type * as THREE from 'three'

export interface SplatTargetSetup {
  id: string
  name: string
  splats: BimSplats
  updateFile: (patch: Partial<DbFile>) => Promise<unknown>
  /** What is already stored, so an accept that moved nothing does not write. */
  storedPlacement?: () => SplatPlacement
}

/** Placement for a loaded splat. Stores a full transform, like a point cloud. */
export function splatTarget({ id, name, splats, updateFile, storedPlacement }: SplatTargetSetup): PlacementTarget {
  return {
    id,
    name,
    capabilities: FULL_PLACEMENT,
    object: (): THREE.Object3D | null => splats.get(id)?.root ?? null,
    read: (): SplatPlacement => splats.get(id)?.placement as SplatPlacement,
    apply: (placement) => {
      splats.setPlacement(id, placement)
    },
    bounds: () => splats.worldCentroid(id),
    commit: async (placement) => {
      const stored = storedPlacement?.()
      if (stored && sameSplatPlacement(placement, stored)) return
      await updateFile(splatPlacementPatch(placement))
    },
  }
}
