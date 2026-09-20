// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { objectTarget } from '../../../shared/placement/objectTarget'

import { placementToRecord } from './mapPlacementGeo'

import type { MapAnchor } from './mapPlacementGeo'
import type { DbFile } from '../../../../../types/dbTypes'
import type { PlacementCapabilities, PlacementTarget } from '../../../shared/placement/placementTarget'
import type * as THREE from 'three'

export interface MapPlacementTargetSetup {
  id: string
  name: string
  object: () => THREE.Object3D | null
  /** The file's own lng/lat/elevation, which the custom layer's model matrix is built from. */
  anchor: MapAnchor
  updateFile: (patch: Partial<DbFile>) => Promise<unknown>
  capabilities: PlacementCapabilities
}

/**
 * Placement for a file drawn in a maplibre custom layer. It moves in scene metres like any
 * other target and stores the result as geography, because that is what a map file's columns are.
 */
export function mapPlacementTarget({
  id,
  name,
  object,
  anchor,
  updateFile,
  capabilities,
}: MapPlacementTargetSetup): PlacementTarget {
  const base = objectTarget({ id, name, object, updateFile, capabilities })

  return {
    ...base,
    commit: async (placement) => {
      const record = placementToRecord(anchor, placement)
      const patch: Partial<DbFile> = {
        lat: record.lat,
        lng: record.lng,
        elevation: record.elevation,
        rotation: record.rotation,
      }
      if (capabilities.scale) patch.scale = record.scale
      await updateFile(patch)
    },
  }
}
