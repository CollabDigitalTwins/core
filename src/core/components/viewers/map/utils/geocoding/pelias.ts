// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Feature } from 'geojson'
import { GEOCODE_EARTH_API_KEY, PELIAS_BASE } from './config'

// Geocode Earth and self-hosted Pelias share this dialect; only the base URL and
// the (optional) api_key differ. Responses already match the shape the app expects.

export const peliasAutocomplete = async (text: string, countryCode: string | undefined, size: number): Promise<Feature[]> => {
  const params = new URLSearchParams({
    'text': text,
    'size': String(size),
  })
  if (countryCode) params.set('boundary.country', countryCode.toUpperCase())
  if (GEOCODE_EARTH_API_KEY) params.set('api_key', GEOCODE_EARTH_API_KEY)

  const response = await fetch(`${PELIAS_BASE}/v1/autocomplete?${params}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  const geojson = await response.json()
  return geojson.features?.length ? geojson.features : []
}

export const peliasReverse = async (
  latitude: string,
  longitude: string,
  countryCode: string | undefined,
  { size, coarse, layers }: { size: number; coarse: boolean; layers?: string },
): Promise<Feature[]> => {
  const params = new URLSearchParams({
    'point.lat': latitude,
    'point.lon': longitude,
    'size': String(size),
  })
  if (countryCode) params.set('boundary.country', countryCode.toUpperCase())
  // coarse (municipality-level) takes precedence; otherwise honor an explicit layer filter.
  if (coarse) params.set('layers', 'coarse')
  else if (layers) params.set('layers', layers)
  if (GEOCODE_EARTH_API_KEY) params.set('api_key', GEOCODE_EARTH_API_KEY)

  const response = await fetch(`${PELIAS_BASE}/v1/reverse?${params}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  const data = await response.json()
  return data.features?.length ? data.features : []
}
