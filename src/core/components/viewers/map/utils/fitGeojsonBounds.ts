// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { bbox } from '@turf/turf'

/**
 * Fits the map view to the bounding box of the given GeoJSON.
 * @param map - The map instance.
 * @param geojson - A GeoJSON FeatureCollection.
 * @param padding - Optional padding for fitBounds (default: 40).
 * @param duration - Optional animation duration in ms (default: 1500).
 */
export function fitGeoJsonBounds(
  map: any,
  geojson: any,
  duration: number = 1500,
  padding: number = 0,
) {
  if (geojson?.features?.length > 0) {
    const bounds = bbox(geojson) // [minX, minY, maxX, maxY]
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { padding, duration },
    )
  }
}
