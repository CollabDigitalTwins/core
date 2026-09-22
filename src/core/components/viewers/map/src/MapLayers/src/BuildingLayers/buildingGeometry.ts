// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ringFromGeoJson, type Ring } from '../SiteLayer/siteGeometry'

import type { BuildingGeometry } from '../../../../../../../types/dbTypes'

const MAX_RINGS = 10
const MAX_POSITIONS_PER_RING = 2000
const MIN_POSITIONS_PER_RING = 4

const isPosition = (value: unknown): value is [number, number] => {
  if (!Array.isArray(value) || value.length < 2) return false
  const [lng, lat] = value
  if (typeof lng !== 'number' || typeof lat !== 'number') return false
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
}

const isClosed = (ring: unknown[]): boolean => {
  const first = ring[0] as [number, number]
  const last = ring[ring.length - 1] as [number, number]
  return first[0] === last[0] && first[1] === last[1]
}

/** Server-side guard for the `buildingGeometry` column, which Prisma types only as `Json`. */
export function isBuildingGeometry(value: unknown): value is BuildingGeometry {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { type?: unknown; coordinates?: unknown }
  if (candidate.type !== 'Polygon') return false
  if (!Array.isArray(candidate.coordinates)) return false
  if (candidate.coordinates.length < 1 || candidate.coordinates.length > MAX_RINGS) return false

  return candidate.coordinates.every((ring) => {
    if (!Array.isArray(ring)) return false
    if (ring.length < MIN_POSITIONS_PER_RING || ring.length > MAX_POSITIONS_PER_RING) return false
    if (!ring.every(isPosition)) return false
    return isClosed(ring)
  })
}

/** Closes the drawn ring, which the draw tools keep open while the user is placing corners. */
export function ringToBuildingGeometry(ring: Ring): BuildingGeometry {
  const closed = ring.length > 0 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
  return { type: 'Polygon', coordinates: [closed ? [...ring] : [...ring, ring[0]]] }
}

/** Reads the stored column back into an open ring, tolerating the Feature forms. */
export function buildingGeometryToRing(value: unknown): Ring | null {
  return ringFromGeoJson(value)
}
