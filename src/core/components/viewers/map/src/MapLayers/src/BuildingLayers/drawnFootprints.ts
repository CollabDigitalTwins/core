// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { isBuildingGeometry } from './buildingGeometry'

import type { Building } from '../../../../../../../types/dbTypes'

const STOREY_HEIGHT_M = 3.5
const DEFAULT_STOREYS = 1

/** West, south, east, north in degrees. */
export type LngLatBounds = [number, number, number, number]

/** Height a building's storey count implies, or the one-storey default. */
export const storeyHeight = (building: Building) => (building.buildingStoreyNum || DEFAULT_STOREYS) * STOREY_HEIGHT_M

/** `[osmId, height]` for every OSM footprint whose building records its storeys, deduped and sorted for a `match`. */
export function osmStoreyHeights(buildings: Building[]): [string, number][] {
  const heights = new Map<string, number>()
  for (const building of buildings) {
    const osmId = String(building.buildingOsmId ?? '').trim()
    if (osmId && building.buildingStoreyNum && !heights.has(osmId)) heights.set(osmId, storeyHeight(building))
  }
  return [...heights].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
}

const hasDrawnFootprint = (building: Building) => isBuildingGeometry(building.buildingGeometry)

/** Buildings with a drawn footprint, as extrudable features keyed by building id. */
export function drawnFootprints(buildings: Building[]): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features = buildings
    .filter(hasDrawnFootprint)
    .map((building): GeoJSON.Feature<GeoJSON.Polygon> => ({
      type: 'Feature',
      id: building.id,
      geometry: building.buildingGeometry as GeoJSON.Polygon,
      properties: {
        dbId: building.id,
        name: building.buildingName ?? null,
        height: storeyHeight(building),
      },
    }))
  return { type: 'FeatureCollection', features }
}

/** OSM footprints a drawn footprint replaces, so the vector-tile layer can leave them out. */
export function overriddenOsmIds(buildings: Building[]): string[] {
  return buildings
    .filter(building => building.buildingOsmId != null && hasDrawnFootprint(building))
    .map(building => String(building.buildingOsmId))
}

function intersects(polygon: GeoJSON.Polygon, [west, south, east, north]: LngLatBounds): boolean {
  const outer = polygon.coordinates[0]
  const lngs = outer.map(([lng]) => lng)
  const lats = outer.map(([, lat]) => lat)
  return Math.min(...lngs) <= east && Math.max(...lngs) >= west && Math.min(...lats) <= north && Math.max(...lats) >= south
}

export function footprintsInBounds(
  footprints: GeoJSON.FeatureCollection<GeoJSON.Polygon>,
  bounds: LngLatBounds | null,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  if (!bounds) return { type: 'FeatureCollection', features: [] }
  return { type: 'FeatureCollection', features: footprints.features.filter(feature => intersects(feature.geometry, bounds)) }
}
