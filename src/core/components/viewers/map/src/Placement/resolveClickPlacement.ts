// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Building } from '../../../../../types/dbTypes'
import type * as maplibregl from 'maplibre-gl'

/** The footprints layer the map draws buildings with, which is what a click is tested against. */
export const BUILDINGS_LAYER_ID = 'maptiler-3d-buildings'

export interface ClickPlacement {
  lng: number
  lat: number
  elevation: number
  /** The building whose footprint was clicked, or null for open ground. */
  buildingId: number | null
}

export interface ClickAt {
  point: { x: number, y: number }
  lngLat: { lng: number, lat: number }
}

const osmIdOf = (feature: { id?: unknown, properties?: Record<string, unknown> | null }): string | null => {
  const raw = feature.properties?.osm_id ?? feature.id
  if (typeof raw === 'string') return raw
  return typeof raw === 'number' ? String(raw) : null
}

/** Where a click lands: its ground position, and the building it fell on if it fell on one. */
export function resolveClickPlacement(
  map: maplibregl.Map,
  at: ClickAt,
  buildings: readonly Building[],
): ClickPlacement {
  const { lng, lat } = at.lngLat
  const elevation = map.queryTerrainElevation([lng, lat]) ?? 0

  if (!map.getLayer(BUILDINGS_LAYER_ID)) return { lng, lat, elevation, buildingId: null }

  const [feature] = map.queryRenderedFeatures(at.point as maplibregl.PointLike, { layers: [BUILDINGS_LAYER_ID] })
  const osmId = feature ? osmIdOf(feature) : null
  const building = osmId == null
    ? undefined
    : buildings.find(candidate => candidate.buildingOsmId != null && String(candidate.buildingOsmId) === osmId)

  return { lng, lat, elevation, buildingId: building?.id ?? null }
}
