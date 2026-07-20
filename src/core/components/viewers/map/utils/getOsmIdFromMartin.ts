// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type maplibregl from 'maplibre-gl' // or 'mapbox-gl'

export async function getOsmIdFromLatLng(
  map: maplibregl.Map,
  lat: number,
  lng: number,
): Promise<number> {
  // Fly to the location with 1 second duration
  map.flyTo({ center: [lng, lat], zoom: 18, duration: 1000 })

  // Wait 2 seconds before querying features
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Convert lat/lng to pixel coordinates
  const point = map.project([lng, lat])
  // Query features at the point
  const features = map.queryRenderedFeatures(point)

  // Find the first feature with osm_id
  const feature = features.find(f => f.properties && f.properties.osm_id)

  if (feature) {
    // Ensure osm_id is a number
    const osmId = Number(feature.properties.osm_id)
    if (isNaN(osmId)) {
      throw new TypeError('osm_id is not a valid number')
    }
    else {
      return osmId
    }
  }
  else {
    throw new Error('No feature with osm_id found at the given location')
  }
}
