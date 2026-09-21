// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins


import { DEFAULT_PLACEMENT } from '../../../shared/pointcloud/pointCloudPlacement'

import { metresToAnchor } from './mapPlacementGeo'

import type { MapAnchor } from './mapPlacementGeo'
import type { DbFile } from '../../../../../types/dbTypes'
import type { PlacementCapabilities, PlacementTarget } from '../../../shared/placement/placementTarget'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'
import type * as THREE from 'three'

export interface MapPlacementTargetSetup {
  id: string
  name: string
  /** The subject the gizmo attaches to. It stays at the scene origin; the anchor is what moves. */
  object: () => THREE.Object3D | null
  anchor: () => MapAnchor
  /** Publishes a live anchor into the layer so the next frame draws it, before anything is saved. */
  preview: (anchor: MapAnchor, rotation: number, scale: number) => void
  updateFile: (patch: Partial<DbFile>) => Promise<unknown>
  capabilities: PlacementCapabilities
}

/** The map's placement is geography: `position` is [lng, elevation, lat], so the card reads degrees. */
export const anchorToPosition = (anchor: MapAnchor): [number, number, number] =>
  [anchor.lng, anchor.elevation, anchor.lat]

export const positionToAnchor = (position: [number, number, number]): MapAnchor =>
  ({ lng: position[0], elevation: position[1], lat: position[2] })

/**
 * Placement for a file drawn in a maplibre custom layer. Dragging moves the layer's own anchor
 * rather than the object inside it, because the anchor is what the file's columns store.
 */
export function mapPlacementTarget({
  id,
  name,
  object,
  anchor,
  preview,
  updateFile,
  capabilities,
}: MapPlacementTargetSetup): PlacementTarget {
  let rotation = 0
  let scale = 1

  const read = (): PointCloudPlacement => ({
    ...DEFAULT_PLACEMENT,
    position: anchorToPosition(anchor()),
    rotation: [0, rotation, 0],
    scale: capabilities.scale ? scale : DEFAULT_PLACEMENT.scale,
  })

  return {
    id,
    name,
    capabilities,
    object,
    read,
    apply: (placement) => {
      rotation = placement.rotation[1]
      if (capabilities.scale) scale = placement.scale
      preview(positionToAnchor(placement.position), rotation, scale)
      // The gizmo measures its next drag from here, so the subject never carries an offset.
      const root = object()
      if (root) {
        root.position.set(0, 0, 0)
        root.updateMatrixWorld(true)
      }
    },
    bounds: () => null,
    commit: async (placement) => {
      const next = positionToAnchor(placement.position)
      const patch: Partial<DbFile> = {
        lng: next.lng,
        lat: next.lat,
        elevation: next.elevation,
        rotation: placement.rotation[1] * (180 / Math.PI),
      }
      if (capabilities.scale) patch.scale = placement.scale
      await updateFile(patch)
    },
  }
}

/** Turns a gizmo drag, which is metres in the layer's scene, into the anchor it should land on. */
export function anchorAfterDrag(anchor: MapAnchor, dragged: THREE.Vector3): MapAnchor {
  return metresToAnchor(anchor, dragged.x, dragged.y, dragged.z)
}
