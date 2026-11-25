// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Collab Digital Twins

import { autocompleteGeocode, reverseGeocode } from '../../components/viewers/map/utils/geocoding'

import type { Feature } from 'geojson'

/** A geocoded place: its display label and WGS84 position. */
export interface PluginPlace {
  label: string
  lng: number
  lat: number
}

const DEFAULT_SEARCH_SIZE = 5

const featurePosition = (feature: Feature): [number, number] | null => {
  if (feature.geometry?.type === 'Point') {
    const [lng, lat] = feature.geometry.coordinates
    return [lng, lat]
  }
  const bbox = feature.bbox
  if (bbox?.length === 4) return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
  return null
}

const featureLabel = (feature: Feature): string => {
  const properties = feature.properties ?? {}
  const label: unknown = properties.label || properties.name
  return typeof label === 'string' ? label : ''
}

const toPluginPlace = (feature: Feature): PluginPlace | null => {
  const position = featurePosition(feature)
  if (!position || !position.every(Number.isFinite)) return null
  const [lng, lat] = position
  return { label: featureLabel(feature), lng, lat }
}

const toPluginPlaces = (features: Feature[]): PluginPlace[] =>
  features.map(toPluginPlace).filter((place): place is PluginPlace => place !== null)

/** Forward search through the platform's configured geocoder; [] when nothing matches. */
export async function searchAddress(text: string, options: { countryCode?: string; size?: number } = {}): Promise<PluginPlace[]> {
  if (!text.trim()) return []
  const features = await autocompleteGeocode(text, options.countryCode ?? '', options.size ?? DEFAULT_SEARCH_SIZE)
  return toPluginPlaces(features)
}

/** Reverse lookup of the nearest address, or null. */
export async function reverseAddress(lng: number, lat: number, options: { countryCode?: string } = {}): Promise<PluginPlace | null> {
  const features = await reverseGeocode(String(lat), String(lng), options.countryCode ?? '', { size: 1 })
  return toPluginPlaces(features)[0] ?? null
}
