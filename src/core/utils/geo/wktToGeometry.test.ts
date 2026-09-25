// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { wktToGeometry } from './wktToGeometry'

describe('wktToGeometry', () => {
  it('parses a point', () => {
    expect(wktToGeometry('POINT (1.5 -2)')).toEqual({ type: 'Point', coordinates: [1.5, -2] })
  })

  it('parses a polygon with a hole', () => {
    expect(wktToGeometry('POLYGON ((0 0, 4 0, 4 4, 0 0), (1 1, 2 1, 2 2, 1 1))')).toEqual({
      type: 'Polygon',
      coordinates: [[[0, 0], [4, 0], [4, 4], [0, 0]], [[1, 1], [2, 1], [2, 2], [1, 1]]],
    })
  })

  it('parses a multipolygon as SQL Server prints it', () => {
    expect(wktToGeometry('MULTIPOLYGON (((2632074.8148 7452363.0894, 2632091.9124 7452354.2762, 2632086.2435 7452343.2787, 2632074.8148 7452363.0894)))')).toEqual({
      type: 'MultiPolygon',
      coordinates: [[[[2632074.8148, 7452363.0894], [2632091.9124, 7452354.2762], [2632086.2435, 7452343.2787], [2632074.8148, 7452363.0894]]]],
    })
  })

  it('accepts both multipoint spellings', () => {
    const expected = { type: 'MultiPoint', coordinates: [[1, 2], [3, 4]] }
    expect(wktToGeometry('MULTIPOINT ((1 2), (3 4))')).toEqual(expected)
    expect(wktToGeometry('MULTIPOINT (1 2, 3 4)')).toEqual(expected)
  })

  it('drops Z and M ordinates', () => {
    expect(wktToGeometry('LINESTRING Z (1 2 3, 4 5 6)')).toEqual({ type: 'LineString', coordinates: [[1, 2], [4, 5]] })
    expect(wktToGeometry('LINESTRING (1 2 3 7, 4 5 6 8)')).toEqual({ type: 'LineString', coordinates: [[1, 2], [4, 5]] })
  })

  it('parses scientific notation and is case-insensitive', () => {
    expect(wktToGeometry('point (1e3 -2.5E-1)')).toEqual({ type: 'Point', coordinates: [1000, -0.25] })
  })

  it.each([
    'POINT EMPTY',
    'GEOMETRYCOLLECTION (POINT (1 2))',
    'POLYGON ((0 0, 1 1)',
    'CIRCLE (1 2)',
    '',
  ])('returns null for %p', (wkt) => {
    expect(wktToGeometry(wkt)).toBeNull()
  })
})
