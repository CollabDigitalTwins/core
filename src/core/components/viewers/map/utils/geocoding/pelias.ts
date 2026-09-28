// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { getGeocodingConfig } from './config'
import { isCountryCode, PLACE_CANDIDATES } from './placeSearch'

import type { PlaceContext, PlaceLevel } from './placeSearch'
import type { Feature } from 'geojson'

// Geocode Earth and self-hosted Pelias share this dialect; only the base URL and
// the (optional) api_key differ. Responses already match the shape the app expects.

export const peliasAutocomplete = async (text: string, countryCode: string | undefined, size: number): Promise<Feature[]> => {
  const { geocodeEarthApiKey, peliasBase } = getGeocodingConfig()

  const params = new URLSearchParams({
    'text': text,
    'size': String(size),
  })
  if (countryCode) params.set('boundary.country', countryCode.toUpperCase())
  if (geocodeEarthApiKey) params.set('api_key', geocodeEarthApiKey)

  const response = await fetch(`${peliasBase}/v1/autocomplete?${params}`)
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
  const { geocodeEarthApiKey, peliasBase } = getGeocodingConfig()

  const params = new URLSearchParams({
    'point.lat': latitude,
    'point.lon': longitude,
    'size': String(size),
  })
  if (countryCode) params.set('boundary.country', countryCode.toUpperCase())
  if (coarse) params.set('layers', 'coarse')
  else if (layers) params.set('layers', layers)
  if (geocodeEarthApiKey) params.set('api_key', geocodeEarthApiKey)

  const response = await fetch(`${peliasBase}/v1/reverse?${params}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  const data = await response.json()
  return data.features?.length ? data.features : []
}

const PELIAS_LAYERS: Record<PlaceLevel, string> = {
  country: 'country',
  countrySubdivision: 'region',
  municipality: 'locality,localadmin',
  address: 'address',
}

const PELIAS_FIELDS: Record<PlaceLevel, string> = {
  country: 'country',
  countrySubdivision: 'region',
  municipality: 'locality',
  address: 'address',
}

export const peliasSearchPlace = async (level: PlaceLevel, name: string, context: PlaceContext): Promise<Feature[]> => {
  const { geocodeEarthApiKey, peliasBase } = getGeocodingConfig()

  const params = new URLSearchParams({ size: String(PLACE_CANDIDATES), layers: PELIAS_LAYERS[level] })
  if (context.country) params.set('country', context.country)
  if (context.countrySubdivision) params.set('region', context.countrySubdivision)
  if (context.municipality) params.set('locality', context.municipality)
  params.set(PELIAS_FIELDS[level], name)
  if (level !== 'country' && isCountryCode(context.country)) params.set('boundary.country', context.country.toUpperCase())
  if (geocodeEarthApiKey) params.set('api_key', geocodeEarthApiKey)

  const response = await fetch(`${peliasBase}/v1/search/structured?${params}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  const data = await response.json()
  return data.features ?? []
}
