// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { isBuildingGeometry } from './buildingGeometry'

import type { Building } from '../../../../../../../types/dbTypes'

const STOREY_HEIGHT_M = 3.5
const DEFAULT_STOREYS = 2

/** Buildings with a hand-drawn footprint and no OSM footprint, as extrudable features keyed by building id. */
export function drawnFootprints(buildings: Building[]): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features = buildings
    .filter(building => building.buildingOsmId == null && isBuildingGeometry(building.buildingGeometry))
    .map((building): GeoJSON.Feature<GeoJSON.Polygon> => ({
      type: 'Feature',
      id: building.id,
      geometry: building.buildingGeometry as GeoJSON.Polygon,
      properties: {
        dbId: building.id,
        name: building.buildingName ?? null,
        height: (building.buildingStoreyNum || DEFAULT_STOREYS) * STOREY_HEIGHT_M,
      },
    }))
  return { type: 'FeatureCollection', features }
}
