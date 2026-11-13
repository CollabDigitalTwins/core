// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { georeferenceToPlacement, hasGeoreference, isOverridden, manualGeoreference } from './georeference'
import { UnknownCrsError } from './reprojectGeometry'

// IfcMapConversion from the Petawawa sample model (MTM zone 9).
const PETAWAWA = {
  fileProjectedCRS: 'EPSG:2951',
  mapConversionEastings: 242177.285039641,
  mapConversionNorthings: 5085871.80253713,
  mapConversionOrthogonalHeight: 0,
  mapConversionXAxisAbscissa: 0.798635510047293,
  mapConversionXAxisOrdinate: 0.601815023152048,
}

describe('georeferenceToPlacement', () => {
  it('converts a projected map conversion to WGS 84', () => {
    const placement = georeferenceToPlacement(PETAWAWA)
    expect(placement?.lng).toBeCloseTo(-77.307189, 5)
    expect(placement?.lat).toBeCloseTo(45.909831, 5)
    expect(placement?.sourceHeight).toBe(0)
  })

  it('turns the x axis direction into a map bearing, corrected for grid convergence', () => {
    const rotation = georeferenceToPlacement(PETAWAWA)?.rotation ?? NaN
    expect(rotation).toBeGreaterThan(322)
    expect(rotation).toBeLessThan(324)
  })

  it('passes WGS 84 coordinates through unchanged', () => {
    const placement = georeferenceToPlacement({ fileProjectedCRS: 'EPSG:4326', mapConversionEastings: -75.7, mapConversionNorthings: 45.4 })
    expect(placement).toMatchObject({ lng: -75.7, lat: 45.4, rotation: 0 })
  })

  it('returns null without source coordinates', () => {
    expect(hasGeoreference({ fileProjectedCRS: 'EPSG:2951' })).toBe(false)
    expect(georeferenceToPlacement({ fileProjectedCRS: 'EPSG:2951' })).toBeNull()
  })

  it('throws on a coordinate system it cannot resolve', () => {
    expect(() => georeferenceToPlacement({ ...PETAWAWA, fileProjectedCRS: 'EPSG:999999' })).toThrow(UnknownCrsError)
  })
})

describe('manualGeoreference', () => {
  it('round-trips a bearing through a projected system', () => {
    const columns = manualGeoreference({ crs: 'EPSG:26918', easting: 445000, northing: 5030000, rotation: 30 })
    expect(georeferenceToPlacement(columns)?.rotation).toBeCloseTo(30, 6)
  })

  it('prefers a pasted proj4 definition over the code', () => {
    const columns = manualGeoreference({ crs: 'custom', proj4Def: '+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs', easting: 445000, northing: 5030000 })
    expect(georeferenceToPlacement(columns)?.lat).toBeCloseTo(45.42, 1)
  })
})

describe('isOverridden', () => {
  const source = georeferenceToPlacement(PETAWAWA)!

  it('is false while the file stands where its source puts it', () => {
    expect(isOverridden({ ...PETAWAWA, lat: source.lat, lng: source.lng, rotation: source.rotation })).toBe(false)
  })

  it('is true once the file is moved or turned', () => {
    expect(isOverridden({ ...PETAWAWA, lat: source.lat + 0.001, lng: source.lng, rotation: source.rotation })).toBe(true)
    expect(isOverridden({ ...PETAWAWA, lat: source.lat, lng: source.lng, rotation: source.rotation + 5 })).toBe(true)
  })
})
