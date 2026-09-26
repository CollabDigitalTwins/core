// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Geometry, GeometryCollection, Position } from 'geojson'

export type SimpleGeometry = Exclude<Geometry, GeometryCollection>

const GEOJSON_TYPES: Record<string, SimpleGeometry['type']> = {
  POINT: 'Point',
  LINESTRING: 'LineString',
  POLYGON: 'Polygon',
  MULTIPOINT: 'MultiPoint',
  MULTILINESTRING: 'MultiLineString',
  MULTIPOLYGON: 'MultiPolygon',
}

const NUMBER = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?`
const POSITION = new RegExp(`(${NUMBER})\\s+(${NUMBER})(?:\\s+${NUMBER})*`, 'g')
const TAGGED_TEXT = /^\s*([A-Za-z]+)(?:\s+(?:ZM|Z|M))?\s*(\([\s\S]*\))\s*$/

function toNestedArrays(body: string): unknown {
  const json = body.replace(POSITION, '[$1,$2]').replaceAll('(', '[').replaceAll(')', ']')
  return JSON.parse(json)
}

/** Parses 2D WKT (Z/M ordinates dropped) into GeoJSON; returns null for EMPTY, collections or malformed text. */
export function wktToGeometry(wkt: string): SimpleGeometry | null {
  const match = TAGGED_TEXT.exec(wkt)
  const type = match ? GEOJSON_TYPES[match[1].toUpperCase()] : undefined
  if (!match || !type) return null

  let nested: unknown
  try {
    nested = toNestedArrays(match[2])
  }
  catch {
    return null
  }
  if (!Array.isArray(nested) || nested.length === 0) return null

  if (type === 'Point') return { type, coordinates: nested[0] as Position }
  if (type === 'MultiPoint') return { type, coordinates: (nested as (Position | Position[])[]).map(p => (Array.isArray(p[0]) ? p[0] : p) as Position) }
  return { type, coordinates: nested } as SimpleGeometry
}
