// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import proj4 from 'proj4'

import { GeoreferenceSource } from '../../types/dbTypes'

import { registerBundledCrs, WGS84 } from './crsDefinitions'
import { UnknownCrsError } from './reprojectGeometry'

import type { DbFile } from '../../types/dbTypes'

export type GeoreferenceColumns = Pick<DbFile,
  | 'fileProjectedCRS'
  | 'sourceProj4Def'
  | 'mapConversionEastings'
  | 'mapConversionNorthings'
  | 'mapConversionOrthogonalHeight'
  | 'mapConversionXAxisAbscissa'
  | 'mapConversionXAxisOrdinate'
  | 'mapConversionScale'
  | 'georeferenceSource'>

/** Where the source puts the file on the map; the height is kept as a reference, never applied. */
export interface SourcePlacement {
  lng: number
  lat: number
  rotation: number
  sourceHeight: number | null
}

export interface ManualGeoreferenceInput {
  crs: string
  proj4Def?: string
  easting: number
  northing: number
  height?: number | null
  rotation?: number
}

const NORTH_PROBE_DEGREES = 1e-4
const POSITION_TOLERANCE_DEGREES = 1e-7
const ROTATION_TOLERANCE_DEGREES = 0.01
const RIGHT_ANGLE = Math.PI / 2

const toDegrees = (radians: number) => radians * 180 / Math.PI
const toRadians = (degrees: number) => degrees * Math.PI / 180
const normalizeDegrees = (degrees: number) => ((degrees % 360) + 360) % 360

function sourceCrsOf(file: GeoreferenceColumns): string {
  return file.sourceProj4Def?.trim() || file.fileProjectedCRS?.trim() || WGS84
}

export function hasGeoreference(file: GeoreferenceColumns): boolean {
  return file.mapConversionEastings != null && file.mapConversionNorthings != null
}

function converterFor(crs: string): proj4.Converter {
  registerBundledCrs()
  try {
    return proj4(crs, WGS84)
  }
  catch {
    throw new UnknownCrsError(`Unknown coordinate system "${crs}"`)
  }
}

// True north's angle CCW from grid east; it drifts from 90° away from the projection's central meridian.
function trueNorthGridAngle(converter: proj4.Converter, easting: number, northing: number): number {
  const [lng, lat] = converter.forward([easting, northing])
  const [x, y] = converter.inverse([lng, lat + NORTH_PROBE_DEGREES])
  return Math.atan2(y - northing, x - easting)
}

function projectToLonLat(crs: string, easting: number, northing: number) {
  if (crs === WGS84) return { lng: easting, lat: northing, northAngle: RIGHT_ANGLE }
  const converter = converterFor(crs)
  const [lng, lat] = converter.forward([easting, northing])
  return { lng, lat, northAngle: trueNorthGridAngle(converter, easting, northing) }
}

export function georeferenceToPlacement(file: GeoreferenceColumns): SourcePlacement | null {
  if (!hasGeoreference(file)) return null
  const { lng, lat, northAngle } = projectToLonLat(
    sourceCrsOf(file),
    file.mapConversionEastings as number,
    file.mapConversionNorthings as number,
  )
  const xAxisAngle = Math.atan2(file.mapConversionXAxisOrdinate ?? 0, file.mapConversionXAxisAbscissa ?? 1)
  const rotation = normalizeDegrees(toDegrees(northAngle - xAxisAngle - RIGHT_ANGLE))
  return { lng, lat, rotation, sourceHeight: file.mapConversionOrthogonalHeight ?? null }
}

export function isOverridden(file: GeoreferenceColumns & Pick<DbFile, 'lat' | 'lng' | 'rotation'>): boolean {
  const source = georeferenceToPlacement(file)
  if (!source || file.lat == null || file.lng == null) return false
  const rotationDelta = Math.abs(normalizeDegrees((file.rotation ?? 0) - source.rotation + 180) - 180)
  return Math.abs(file.lat - source.lat) > POSITION_TOLERANCE_DEGREES
    || Math.abs(file.lng - source.lng) > POSITION_TOLERANCE_DEGREES
    || rotationDelta > ROTATION_TOLERANCE_DEGREES
}

/** Stored in the same columns an IfcMapConversion fills; `rotation` is a map bearing in degrees. */
export function manualGeoreference({ crs, proj4Def, easting, northing, height, rotation = 0 }: ManualGeoreferenceInput): GeoreferenceColumns {
  const sourceProj4Def = proj4Def?.trim() || null
  const fileProjectedCRS = crs.trim() || null
  const { northAngle } = projectToLonLat(sourceCrsOf({ fileProjectedCRS, sourceProj4Def }), easting, northing)
  const xAxisAngle = northAngle - RIGHT_ANGLE - toRadians(rotation)
  return {
    fileProjectedCRS,
    sourceProj4Def,
    mapConversionEastings: easting,
    mapConversionNorthings: northing,
    mapConversionOrthogonalHeight: height ?? null,
    mapConversionXAxisAbscissa: Math.cos(xAxisAngle),
    mapConversionXAxisOrdinate: Math.sin(xAxisAngle),
    mapConversionScale: 1,
    georeferenceSource: GeoreferenceSource.manual,
  }
}

export function sourcePlacementPatch(file: GeoreferenceColumns): Pick<DbFile, 'lat' | 'lng' | 'rotation'> | null {
  const source = georeferenceToPlacement(file)
  return source ? { lat: source.lat, lng: source.lng, rotation: source.rotation } : null
}
