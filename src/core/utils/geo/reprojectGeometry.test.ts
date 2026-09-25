// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { createLonLatProjector, reprojectGeometry, UnknownCrsError } from './reprojectGeometry'

const NB_STEREOGRAPHIC = '+proj=sterea +lat_0=46.5 +lon_0=-66.5 +k=0.999912 +x_0=2500000 +y_0=7500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'

describe('createLonLatProjector', () => {
  it('treats data with no CRS as lon/lat', () => {
    expect(createLonLatProjector({})([-64.8, 46.1])).toEqual([-64.8, 46.1])
  })

  it('converts from an EPSG code proj4 ships', () => {
    const [lon, lat] = createLonLatProjector({ sourceCrs: 'EPSG:3857' })([-7213572, 5796290])
    expect(lon).toBeCloseTo(-64.8, 1)
    expect(lat).toBeCloseTo(46.1, 1)
  })

  it('prefers the proj4 definition over the code', () => {
    const project = createLonLatProjector({ sourceCrs: 'EPSG:2953', sourceProj4Def: NB_STEREOGRAPHIC })
    const [lon, lat] = project([2630764.81, 7457558.23])
    expect(lon).toBeCloseTo(-64.8085, 3)
    expect(lat).toBeCloseTo(46.1056, 3)
  })

  it('rounds to six decimals', () => {
    expect(createLonLatProjector({})([-64.12345678, 46.98765432])).toEqual([-64.123457, 46.987654])
  })

  it('throws UnknownCrsError for a code proj4 does not ship', () => {
    expect(() => createLonLatProjector({ sourceCrs: 'EPSG:2953' })).toThrow(UnknownCrsError)
  })
})

describe('reprojectGeometry', () => {
  const shift = ([x, y]: number[]) => [x + 1, y + 1]

  it('projects every position of a nested geometry', () => {
    expect(reprojectGeometry({ type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [0, 0]]]] }, shift)).toEqual({
      type: 'MultiPolygon',
      coordinates: [[[[1, 1], [2, 1], [1, 1]]]],
    })
  })

  it('projects a point', () => {
    expect(reprojectGeometry({ type: 'Point', coordinates: [2, 3] }, shift)).toEqual({ type: 'Point', coordinates: [3, 4] })
  })

  it('returns null when a position leaves lon/lat range', () => {
    expect(reprojectGeometry({ type: 'LineString', coordinates: [[0, 0], [2632074, 7452363]] }, p => p)).toBeNull()
  })
})
