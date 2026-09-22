// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { MercatorCoordinate } from 'maplibre-gl'

import type { Building, DbFile } from '../../../../../types/dbTypes'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180

/** Where a map file sits: its own lng/lat/elevation, which the custom layer's model matrix uses. */
export interface MapAnchor {
  lng: number
  lat: number
  elevation: number
}

/** The columns a placed map file stores. `rotation` is DEGREES, matching DbFile.rotation. */
export interface MapPlacementRecord {
  lng: number
  lat: number
  elevation: number
  rotation: number
  scale: number
}

interface MercatorFrame {
  x: number
  y: number
  z: number
  unit: number
}

function frameOf(anchor: MapAnchor): MercatorFrame {
  const origin = MercatorCoordinate.fromLngLat([anchor.lng, anchor.lat], anchor.elevation)

  return { x: origin.x, y: origin.y, z: origin.z, unit: origin.meterInMercatorCoordinateUnits() }
}

/**
 * Moves an anchor by scene-space metres (+east, +up, +south). Metres-per-mercator-unit is
 * latitude-dependent, so this is exact at the anchor and sub-millimetre off by 200 m.
 */
export function metresToAnchor(anchor: MapAnchor, east: number, up: number, south: number): MapAnchor {
  const frame = frameOf(anchor)
  const moved = new MercatorCoordinate(frame.x + east * frame.unit, frame.y + south * frame.unit, frame.z)
  const { lng, lat } = moved.toLngLat()

  return { lng, lat, elevation: anchor.elevation + up }
}

/** Scene-space placement to the geographic columns, relative to the file's current anchor. */
export function placementToRecord(anchor: MapAnchor, placement: PointCloudPlacement): MapPlacementRecord {
  const [east, up, south] = placement.position
  const moved = metresToAnchor(anchor, east, up, south)

  return {
    lng: moved.lng,
    lat: moved.lat,
    elevation: moved.elevation,
    rotation: placement.rotation[1] * RAD_TO_DEG,
    scale: placement.scale,
  }
}

/** Stored columns back to a scene-space placement; the map stores yaw only. */
export function recordToPlacement(anchor: MapAnchor, record: MapPlacementRecord): PointCloudPlacement {
  const frame = frameOf(anchor)
  const target = MercatorCoordinate.fromLngLat([record.lng, record.lat], record.elevation)

  return {
    position: [
      (target.x - frame.x) / frame.unit,
      record.elevation - anchor.elevation,
      (target.y - frame.y) / frame.unit,
    ],
    rotation: [0, record.rotation * DEG_TO_RAD, 0],
    scale: record.scale,
    sourceUp: 'y',
  }
}

/** Position, rotation and elevation of a BIM file, falling back to its building's values. */
export const extractPositionAndRotation = (bimFile: DbFile, building?: Building) => ({
  lng: bimFile.lng ?? building?.buildingLongitude ?? null,
  lat: bimFile.lat ?? building?.buildingLatitude ?? null,
  rotation: bimFile.rotation ?? building?.rotation ?? 0,
  elevation: bimFile.elevation ?? building?.buildingElevation ?? 0,
})
