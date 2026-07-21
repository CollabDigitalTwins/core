// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Load a user-pasted datasource URL into the map.
 *
 * Three source types:
 *  - geojson  — fetch the URL, parse it as GeoJSON
 *  - arcgis   — page an ArcGIS Feature Service layer into a FeatureCollection
 *  - wms      — add the WMS as a raster overlay (no fetch — MapLibre loads tiles)
 *
 * The vector types (geojson/arcgis) produce a ParsedGeoJSON the caller turns
 * into a Dataset. WMS goes straight onto the map as a raster source/layer.
 */
import { fetchArcGISLayerFeatures } from './arcgisFetch'
import { parseGeoJSON, summarizeFeatures, type ParsedGeoJSON } from './geojsonFile'

import type { Map as MapLibreMap } from 'maplibre-gl'

export type UrlSourceType = 'geojson' | 'arcgis' | 'wms'

/** Best-guess the source type from a URL. The UI lets the user override. */
export function detectSourceType(url: string): UrlSourceType {
  const u = url.toLowerCase()
  if (u.includes('service=wms') || u.includes('/wms')) return 'wms'
  if (/\/(feature|map)server(\/\d+)?/i.test(u)) return 'arcgis'
  return 'geojson'
}

/** Pull a `LAYERS`/`layers` value out of a WMS URL, if present. */
export function extractWmsLayers(url: string): string {
  try {
    const params = new URL(url).searchParams
    for (const [key, value] of params) {
      if (key.toLowerCase() === 'layers' && value) return value
    }
  }
  catch { /* not a parseable URL yet */ }
  return ''
}

/** Derive a short, human-ish dataset name from a URL. */
export function nameFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl)
    const skip = /^(\d+|feature server|featureserver|mapserver|services?|rest|arcgis|wms|geoserver|ows)$/i
    const segments = u.pathname.split('/').filter(s => s && !skip.test(s))
    return segments[segments.length - 1] ?? u.hostname
  }
  catch {
    return rawUrl
  }
}

/** Fetch a GeoJSON URL or an ArcGIS Feature Service layer URL into a FeatureCollection + summary. */
export async function loadVectorUrl(
  url: string,
  type: 'geojson' | 'arcgis',
): Promise<ParsedGeoJSON> {
  if (type === 'arcgis') {
    const features: GeoJSON.Feature[] = []
    // Cap pages so a huge layer can't hang the browser.
    for await (const feature of fetchArcGISLayerFeatures(url, { maxPages: 10 })) {
      features.push(feature)
    }
    return {
      featureCollection: { type: 'FeatureCollection', features },
      summary: summarizeFeatures(features),
    }
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return parseGeoJSON(await res.text())
}

/** Build a MapLibre raster tile-URL template for a WMS GetMap endpoint. */
export function buildWmsTileUrl(baseUrl: string, layers: string): string {
  const base = baseUrl.split('?')[0]
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    LAYERS: layers,
    SRS: 'EPSG:3857',
    WIDTH: '256',
    HEIGHT: '256',
  })
  // {bbox-epsg-3857} must stay literal — MapLibre substitutes it per tile.
  return `${base}?${params.toString()}&BBOX={bbox-epsg-3857}`
}

/**
 * Add a WMS layer to the map as a raster source. Returns the source/layer id.
 * WMS is a raster overlay, so it can't go through the Dataset/OpenDataLayers
 * path — it's added directly here.
 */
export function addWmsToMap(map: MapLibreMap, baseUrl: string, layers: string): string {
  const id = `url-wms-${Date.now()}`
  map.addSource(id, {
    type: 'raster',
    tiles: [buildWmsTileUrl(baseUrl, layers)],
    tileSize: 256,
  })
  map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': 0.85 } })
  return id
}
