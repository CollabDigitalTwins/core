// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Pure GeoJSON file parsing + summarising.
 *
 * Used by the "Add dataset" tool to turn a dropped/picked .geojson file into a
 * normalised FeatureCollection plus a quick summary. No IO, no dependencies —
 * safe to unit-test directly.
 */

export interface GeoJSONSummary {
  featureCount: number
  /** Geometry type → count, e.g. { Point: 12, Polygon: 3 }. */
  geometryTypes: Record<string, number>
  /** Sorted union of all feature property keys. */
  propertyKeys: string[]
  /** [west, south, east, north], or null if no positional coordinates were found. */
  bbox: [number, number, number, number] | null
  /** The first feature, for a raw peek. */
  sample: unknown
}

export interface ParsedGeoJSON {
  /** Normalised — any valid GeoJSON input becomes a FeatureCollection. */
  featureCollection: GeoJSON.FeatureCollection
  summary: GeoJSONSummary
}

const GEOMETRY_TYPES = [
  'Point', 'MultiPoint', 'LineString', 'MultiLineString',
  'Polygon', 'MultiPolygon', 'GeometryCollection',
]

/** Normalise any GeoJSON object to a flat list of Features. */
function extractFeatures(parsed: unknown): GeoJSON.Feature[] {
  if (!parsed || typeof parsed !== 'object') throw new Error('File is not a JSON object')
  const obj = parsed as GeoJSON.GeoJSON

  if (obj.type === 'FeatureCollection') {
    return Array.isArray(obj.features) ? obj.features : []
  }
  if (obj.type === 'Feature') return [obj]
  if (GEOMETRY_TYPES.includes(obj.type)) {
    return [{ type: 'Feature', geometry: obj as GeoJSON.Geometry, properties: {} }]
  }
  throw new Error(`Unrecognised GeoJSON type: "${(obj as { type?: string }).type ?? 'none'}"`)
}

/** Recursively widen `bbox` to include every [x, y] position inside `coords`. */
function extendBbox(bbox: [number, number, number, number], coords: unknown): void {
  if (!Array.isArray(coords)) return
  if (
    coords.length >= 2
    && typeof coords[0] === 'number'
    && typeof coords[1] === 'number'
  ) {
    const [x, y] = coords as [number, number]
    bbox[0] = Math.min(bbox[0], x)
    bbox[1] = Math.min(bbox[1], y)
    bbox[2] = Math.max(bbox[2], x)
    bbox[3] = Math.max(bbox[3], y)
    return
  }
  for (const c of coords) extendBbox(bbox, c)
}

export function summarizeFeatures(features: GeoJSON.Feature[]): GeoJSONSummary {
  const geometryTypes: Record<string, number> = {}
  const propertyKeys = new Set<string>()
  const bbox: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]

  for (const feature of features) {
    const geometry = feature?.geometry
    if (geometry && typeof geometry.type === 'string') {
      geometryTypes[geometry.type] = (geometryTypes[geometry.type] ?? 0) + 1
      if ('coordinates' in geometry) extendBbox(bbox, geometry.coordinates)
    }
    if (feature?.properties && typeof feature.properties === 'object') {
      for (const key of Object.keys(feature.properties)) propertyKeys.add(key)
    }
  }

  return {
    featureCount: features.length,
    geometryTypes,
    propertyKeys: [...propertyKeys].sort(),
    bbox: bbox[0] === Infinity ? null : bbox,
    sample: features[0] ?? null,
  }
}

/** Parse GeoJSON text into a normalised FeatureCollection + a summary. Throws on invalid input. */
export function parseGeoJSON(text: string): ParsedGeoJSON {
  const features = extractFeatures(JSON.parse(text))
  return {
    featureCollection: { type: 'FeatureCollection', features },
    summary: summarizeFeatures(features),
  }
}
