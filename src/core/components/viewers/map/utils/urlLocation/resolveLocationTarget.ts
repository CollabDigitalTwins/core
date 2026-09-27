// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { isCountryCode, normalizeSubdivision, subdivisionCountry } from '../geocoding/placeSearch'

import { clearFinerLabels, labelsFromParams, labelsFromPlace } from './locationParams'
import { DEFAULT_LEVEL_ZOOM, parseBbox, parseLngLat, parseZoom, presentLevels } from './locationTarget'

import type { LocationLabels } from './locationParams'
import type { CameraTarget, LocationLevel } from './locationTarget'
import type { Building, Site } from '../../../../../types/dbTypes'
import type { PlaceContext, PlaceLevel } from '../geocoding/placeSearch'
import type { Feature } from 'geojson'

export interface ResolvedLocation {
  level: LocationLevel
  target: CameraTarget
  labels: LocationLabels
}

export interface ResolveDeps {
  searchPlace: (level: PlaceLevel, name: string, context: PlaceContext) => Promise<Feature | null>
  site?: Site | null
  building?: Building | null
  /** Used when the URL carries no `country`. */
  countryCode?: string
}

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const pointAt = (lng: unknown, lat: unknown, zoom: number): CameraTarget | null =>
  isNumber(lng) && isNumber(lat) ? { center: [lng, lat], zoom } : null

function placeContext(level: PlaceLevel, params: URLSearchParams, countryCode?: string): PlaceContext {
  const country = params.get('country')?.trim() || subdivisionCountry(params.get('countrySubdivision')) || countryCode || undefined
  if (level === 'country') return {}
  const countrySubdivision = normalizeSubdivision(params.get('countrySubdivision')) || undefined
  if (level === 'countrySubdivision') return { country }
  const municipality = params.get('municipality')?.trim() || undefined
  if (level === 'municipality') return { country, countrySubdivision }
  return { country, countrySubdivision, municipality }
}

function placeTarget(level: PlaceLevel, feature: Feature, zoom: number): CameraTarget | null {
  const bbox = feature.bbox
  if (level !== 'address' && bbox?.length === 4 && bbox[0] < bbox[2] && bbox[1] < bbox[3]) {
    return { bounds: [bbox[0], bbox[1], bbox[2], bbox[3]] }
  }
  const [lng, lat] = feature.geometry?.type === 'Point' ? feature.geometry.coordinates : []
  return pointAt(lng, lat, zoom)
}

async function resolvePlace(level: PlaceLevel, params: URLSearchParams, deps: ResolveDeps): Promise<ResolvedLocation | null> {
  const raw = params.get(level)?.trim() ?? ''
  const name = level === 'countrySubdivision' ? normalizeSubdivision(raw) : raw
  const context = placeContext(level, params, deps.countryCode)
  const feature = await deps.searchPlace(level, name, context)
  const zoom = level === 'address' ? parseZoom(params) ?? DEFAULT_LEVEL_ZOOM.address : DEFAULT_LEVEL_ZOOM[level]
  const target = feature && placeTarget(level, feature, zoom)
  if (!target) return null

  const found = labelsFromPlace(feature.properties, level === 'address' ? name : undefined)
  const country = found.country || (isCountryCode(context.country) ? context.country.toUpperCase() : undefined)
  const merged = { ...labelsFromParams(params), ...stripEmpty({ ...found, country }), [level]: level === 'address' ? name : found[level] || name }
  return { level, target, labels: clearFinerLabels(merged, level) }
}

const stripEmpty = (labels: LocationLabels): LocationLabels =>
  Object.fromEntries(Object.entries(labels).filter(([, value]) => value))

function resolveRecord(level: 'site' | 'buildingId', params: URLSearchParams, deps: ResolveDeps): ResolvedLocation | null {
  const zoom = parseZoom(params) ?? DEFAULT_LEVEL_ZOOM[level]
  const record = level === 'site'
    ? deps.site && { lng: deps.site.siteLongitude, lat: deps.site.siteLatitude, municipality: deps.site.siteMunicipality, countrySubdivision: deps.site.siteCountrySubdivision }
    : deps.building && { lng: deps.building.buildingLongitude, lat: deps.building.buildingLatitude, municipality: deps.building.buildingMunicipality, countrySubdivision: deps.building.buildingCountrySubdivision }
  const target = record && pointAt(record.lng, record.lat, zoom)
  if (!target) return null

  const labels = { ...labelsFromParams(params), ...stripEmpty({ municipality: record.municipality, countrySubdivision: record.countrySubdivision }) }
  return { level, target, labels: clearFinerLabels(labels, level) }
}

async function resolveLevel(level: LocationLevel, params: URLSearchParams, deps: ResolveDeps): Promise<ResolvedLocation | null> {
  switch (level) {
    case 'latlng': {
      const [lng, lat] = parseLngLat(params) ?? []
      const target = pointAt(lng, lat, parseZoom(params) ?? DEFAULT_LEVEL_ZOOM.latlng)
      return target && { level, target, labels: labelsFromParams(params) }
    }
    case 'bbox': {
      const bounds = parseBbox(params.get('bbox'))
      return bounds && { level, target: { bounds }, labels: labelsFromParams(params) }
    }
    case 'site':
    case 'buildingId': return resolveRecord(level, params, deps)
    case 'asset': return null
    default: return resolvePlace(level, params, deps)
  }
}

/** Resolves the finest level in `params`, walking up the hierarchy until one lands. Null leaves the map where it is. */
export async function resolveLocationTarget(params: URLSearchParams, deps: ResolveDeps): Promise<ResolvedLocation | null> {
  for (const level of presentLevels(params)) {
    try {
      const resolved = await resolveLevel(level, params, deps)
      if (resolved) return resolved
    }
    catch (error) {
      console.warn(`Map URL: could not resolve ${level}; trying the next level up.`, error)
    }
  }
  return null
}
