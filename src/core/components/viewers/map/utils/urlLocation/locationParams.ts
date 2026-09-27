// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { LOCATION_LEVELS } from './locationTarget'

import type { Bbox, CameraTarget, LocationLevel } from './locationTarget'
import type { Map as MapLibreMap } from 'maplibre-gl'

export const LABEL_KEYS = ['country', 'countrySubdivision', 'municipality', 'site', 'address', 'buildingId'] as const

export type LabelKey = typeof LABEL_KEYS[number]

export type LocationLabels = Partial<Record<LabelKey, string>>

/** Place names the map owns in the URL. `site`, `buildingId` and every other param are read but never rewritten. */
const MAP_LABEL_KEYS = ['country', 'countrySubdivision', 'municipality', 'address'] as const

export interface CameraSnapshot {
  lat: number
  lng: number
  zoom: number
  bearing: number
  pitch: number
  bounds: Bbox
}

interface PlaceProperties {
  country_a?: string
  region_a?: string
  region?: string
  locality?: string
  neighbourhood?: string
  county?: string
}

export function labelsFromParams(params: URLSearchParams): LocationLabels {
  const labels: LocationLabels = {}
  for (const key of LABEL_KEYS) {
    const value = params.get(key)?.trim()
    if (value) labels[key] = value
  }
  return labels
}

export function labelsFromPlace(properties: PlaceProperties | null | undefined, address?: string): LocationLabels {
  const p = properties ?? {}
  return {
    country: p.country_a?.length === 2 ? p.country_a : undefined,
    countrySubdivision: p.region_a || p.region || undefined,
    municipality: p.locality || p.neighbourhood || p.county || undefined,
    address: address || undefined,
  }
}

/** Labels finer than `level` describe somewhere else once the map has flown there, so they are dropped. */
export function clearFinerLabels(labels: LocationLabels, level: LocationLevel): LocationLabels {
  const depth = LOCATION_LEVELS.indexOf(level)
  return Object.fromEntries(
    Object.entries(labels).filter(([key]) => LOCATION_LEVELS.indexOf(key as LocationLevel) <= depth),
  )
}

const round = (value: number, digits: number) => String(Number(value.toFixed(digits)))

export function withLocationParams(params: URLSearchParams, camera: CameraSnapshot, labels: LocationLabels) {
  const next = new URLSearchParams(params.toString())
  next.set('lat', round(camera.lat, 7))
  next.set('lng', round(camera.lng, 7))
  next.set('zoom', round(camera.zoom, 2))
  next.set('bearing', round(camera.bearing, 1))
  next.set('pitch', round(camera.pitch, 1))
  next.set('bbox', camera.bounds.map(value => round(value, 6)).join(','))
  for (const key of MAP_LABEL_KEYS) {
    const value = labels[key]
    if (value) next.set(key, value)
    else next.delete(key)
  }
  return next
}

export function cameraSnapshot(map: MapLibreMap): CameraSnapshot {
  const center = map.getCenter()
  const bounds = map.getBounds()
  return {
    lat: center.lat,
    lng: center.lng,
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
    bounds: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
  }
}

/** `URLSearchParams` escapes commas, which are legal in a query; keep them readable so `bbox=w,s,e,n` stays legible. */
export const toQueryString = (params: URLSearchParams) => params.toString().replace(/%2C/gi, ',')

/** Rewrites the live URL's params in place: no server round trip, and Next's router adopts the result. */
export function replaceUrlParams(update: (params: URLSearchParams) => URLSearchParams) {
  const url = new URL(window.location.href)
  url.search = toQueryString(update(url.searchParams))
  // Forwarding history.state would carry Next's __NA marker, and Next then skips syncing its router to this URL.
  window.history.replaceState({}, '', url.toString())
}

/** Writes the map's current camera plus `labels` into the address bar without a navigation. */
export function writeLocationParams(map: MapLibreMap, labels: LocationLabels): CameraSnapshot {
  const camera = cameraSnapshot(map)
  replaceUrlParams(params => withLocationParams(params, camera, labels))
  return camera
}

export function flyToCamera(map: MapLibreMap, target: CameraTarget) {
  if ('bounds' in target) map.fitBounds(target.bounds, { speed: 2 })
  else map.flyTo({ center: target.center, zoom: target.zoom, speed: 2, essential: true })
}

/** Flies to `target` and, once the camera settles, rewrites the URL with every location value. */
export function flyAndSyncUrl(map: MapLibreMap, target: CameraTarget, labels: LocationLabels): Promise<CameraSnapshot> {
  return new Promise(resolve => {
    map.once('moveend', () => resolve(writeLocationParams(map, labels)))
    flyToCamera(map, target)
  })
}
