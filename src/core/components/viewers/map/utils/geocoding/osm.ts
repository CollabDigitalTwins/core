// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { normalizePhotonFeature, normalizeNominatimResult, subdivisionName } from './adapters'
import { getGeocodingConfig } from './config'
import { isCountryCode, PLACE_CANDIDATES } from './placeSearch'

import type { PlaceContext, PlaceLevel } from './placeSearch'
import type { Feature } from 'geojson'

// Free, no-key public OSM fallbacks. Photon serves autocomplete (it is built for
// per-keystroke search); Nominatim serves reverse lookups (occasional, single point).

export const photonAutocomplete = async (text: string, countryCode: string | undefined, size: number): Promise<Feature[]> => {
  const { photonUrl } = getGeocodingConfig()

  // Photon has no country filter, so over-fetch and post-filter by country code.
  const params = new URLSearchParams({ q: text, limit: String(size * 2), lang: 'en' })

  const response = await fetch(`${photonUrl}/api?${params}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  const data = await response.json()
  let features: Feature[] = (data.features || []).map(normalizePhotonFeature)

  if (countryCode) {
    const cc = countryCode.toUpperCase()
    const inCountry = features.filter(f => {
      const ca = (f.properties as any)?.country_a
      return !ca || ca === cc
    })
    if (inCountry.length) features = inCountry
  }

  return features.slice(0, size)
}

export const nominatimReverse = async (
  latitude: string,
  longitude: string,
  { coarse }: { coarse: boolean },
): Promise<Feature[]> => {
  const { nominatimUrl } = getGeocodingConfig()

  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: latitude,
    lon: longitude,
    addressdetails: '1',
    zoom: coarse ? '10' : '18',
  })

  const response = await fetch(`${nominatimUrl}/reverse?${params}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  const data = await response.json()
  if (!data || data.error || data.lat == null) return []
  return [normalizeNominatimResult(data)]
}

const NOMINATIM_FIELDS: Record<PlaceLevel, string> = {
  country: 'country',
  countrySubdivision: 'state',
  municipality: 'city',
  address: 'street',
}

const NOMINATIM_FEATURE_TYPES: Partial<Record<PlaceLevel, string>> = {
  country: 'country',
  countrySubdivision: 'state',
  municipality: 'settlement',
}

// Nominatim matches `state=Quebec` but not `state=QC`, so known codes are expanded to names.
const nominatimSubdivision = (value: string, country?: string): string =>
  (isCountryCode(country) && subdivisionName(country, value)) || value

export const nominatimSearchPlace = async (level: PlaceLevel, name: string, context: PlaceContext): Promise<Feature[]> => {
  const { nominatimUrl } = getGeocodingConfig()

  const params = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', limit: String(PLACE_CANDIDATES) })
  if (isCountryCode(context.country)) params.set('countrycodes', context.country.toLowerCase())
  else if (context.country) params.set('country', context.country)
  if (context.countrySubdivision) params.set('state', nominatimSubdivision(context.countrySubdivision, context.country))
  if (context.municipality) params.set('city', context.municipality)

  const value = level === 'countrySubdivision' ? nominatimSubdivision(name, context.country) : name
  params.set(NOMINATIM_FIELDS[level], value)
  if (level === 'country' && isCountryCode(name)) params.set('countrycodes', name.toLowerCase())
  const featureType = NOMINATIM_FEATURE_TYPES[level]
  if (featureType) params.set('featureType', featureType)

  const response = await fetch(`${nominatimUrl}/search?${params}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  const data = await response.json()
  return Array.isArray(data) ? data.map(normalizeNominatimResult) : []
}
