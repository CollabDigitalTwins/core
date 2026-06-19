// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { MapGeoJSONFeature } from 'maplibre-gl'

/**
 * Extracts coordinates from a MapGeoJSONFeature in a type-safe manner.
 * Handles multiple coordinate formats:
 * - Standard GeoJSON array: [lng, lat]
 * - Object formats: { lng, lat }, { lon, lat }, { x, y }
 * 
 * @param feature - The MapGeoJSONFeature to extract coordinates from
 * @returns An object with lng and lat properties, or null if coordinates cannot be extracted
 */
export function extractCoordinatesFromFeature(
  feature: MapGeoJSONFeature
): { lng: number; lat: number } | null {
  // Type guard to ensure geometry has coordinates
  if (!('coordinates' in feature.geometry)) {
    return null
  }

  const coords = feature.geometry.coordinates

  let lng: number
  let lat: number

  if (Array.isArray(coords)) {
    // Standard GeoJSON array format: [lng, lat]
    [lng, lat] = coords as [number, number]
  } else if (typeof coords === 'object' && coords !== null) {
    // Handle object format: { lng, lat } or { lon, lat } or { x, y }
    lng = (coords as any).lng ?? (coords as any).lon ?? (coords as any).x
    lat = (coords as any).lat ?? (coords as any).y
  } else {
    return null // Invalid coordinate format
  }

  // Validate that we have valid numbers
  if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
    return null
  }

  return { lng, lat }
}
