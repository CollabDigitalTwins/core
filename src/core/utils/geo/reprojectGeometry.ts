// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import proj4 from 'proj4'

import type { SimpleGeometry } from './wktToGeometry'
import type { Position } from 'geojson'
import type { Converter } from 'proj4'

export interface SourceCrs {
  sourceCrs?: string
  sourceProj4Def?: string
}

export type Projector = (position: Position) => Position

export class UnknownCrsError extends Error {}

const LON_LAT = 'EPSG:4326'

function roundTo6(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/** Builds a projector to lon/lat; `sourceProj4Def` wins over `sourceCrs`, and neither means the data is already EPSG:4326. */
export function createLonLatProjector({ sourceCrs, sourceProj4Def }: SourceCrs): Projector {
  const source = sourceProj4Def?.trim() || sourceCrs?.trim() || LON_LAT
  let converter: Converter
  try {
    converter = proj4(source, LON_LAT)
  }
  catch {
    throw new UnknownCrsError(`Unknown coordinate system "${source}"`)
  }
  return ([x, y]) => converter.forward([x, y]).map(roundTo6)
}

function isPosition(value: unknown[]): value is Position {
  return typeof value[0] === 'number'
}

function mapPositions(value: unknown[], project: Projector): unknown[] {
  return isPosition(value) ? project(value) : value.map(child => mapPositions(child as unknown[], project))
}

function isLonLat([lon, lat]: Position): boolean {
  return Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90
}

function allPositions(value: unknown[]): Position[] {
  return isPosition(value) ? [value] : value.flatMap(child => allPositions(child as unknown[]))
}

/** Reprojects a geometry, or returns null when any position lands outside lon/lat range (a wrong source CRS). */
export function reprojectGeometry<G extends SimpleGeometry>(geometry: G, project: Projector): G | null {
  const coordinates = mapPositions(geometry.coordinates as unknown[], project)
  return allPositions(coordinates).every(isLonLat) ? { ...geometry, coordinates } as G : null
}
