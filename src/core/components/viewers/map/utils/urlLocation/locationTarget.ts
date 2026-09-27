// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Coarse to fine. The map flies to the finest level the URL carries, falling back up on failure. */
export const LOCATION_LEVELS = [
  'country',
  'countrySubdivision',
  'municipality',
  'site',
  'address',
  'buildingId',
  'asset',
  'bbox',
  'latlng',
] as const

export type LocationLevel = typeof LOCATION_LEVELS[number]

export type Bbox = [west: number, south: number, east: number, north: number]

export type CameraTarget =
  | { center: [lng: number, lat: number]; zoom: number }
  | { bounds: Bbox }

export const DEFAULT_LEVEL_ZOOM = {
  country: 4,
  countrySubdivision: 6,
  municipality: 12,
  site: 16,
  address: 18,
  buildingId: 18,
  latlng: 14,
} as const

const trimmed = (params: URLSearchParams, key: string) => (params.get(key) ?? '').trim()

const isNumericId = (value: string) => /^\d+$/.test(value)

export function parseBbox(value: string | null): Bbox | null {
  const parts = (value ?? '').split(',').map(part => Number.parseFloat(part))
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null
  const [west, south, east, north] = parts
  return west < east && south < north ? [west, south, east, north] : null
}

export function parseLngLat(params: URLSearchParams): [number, number] | null {
  const lat = Number.parseFloat(params.get('lat') ?? '')
  const lng = Number.parseFloat(params.get('lng') ?? '')
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat === 0 && lng === 0) return null
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lng, lat] : null
}

export function parseZoom(params: URLSearchParams): number | undefined {
  const zoom = Number.parseFloat(params.get('zoom') ?? '')
  return Number.isFinite(zoom) ? zoom : undefined
}

function hasLevel(level: LocationLevel, params: URLSearchParams): boolean {
  switch (level) {
    case 'latlng': return parseLngLat(params) !== null
    case 'bbox': return parseBbox(params.get('bbox')) !== null
    case 'asset': return false
    case 'site':
    case 'buildingId': return isNumericId(trimmed(params, level))
    default: return trimmed(params, level) !== ''
  }
}

/** Every valid level in the URL, finest first: the order to try them in. */
export function presentLevels(params: URLSearchParams): LocationLevel[] {
  return [...LOCATION_LEVELS].reverse().filter(level => hasLevel(level, params))
}
