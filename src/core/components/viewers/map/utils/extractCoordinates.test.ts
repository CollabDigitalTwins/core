// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { extractCoordinatesFromFeature } from './extractCoordinates'

function feature(geometry: any): any {
  return { geometry }
}

describe('extractCoordinatesFromFeature', () => {
  it('extracts [lng, lat] from a standard GeoJSON Point', () => {
    expect(extractCoordinatesFromFeature(feature({ type: 'Point', coordinates: [-75, 45] })))
      .toEqual({ lng: -75, lat: 45 })
  })

  it('extracts from a { lng, lat } object', () => {
    expect(extractCoordinatesFromFeature(feature({ coordinates: { lng: 1, lat: 2 } })))
      .toEqual({ lng: 1, lat: 2 })
  })

  it('extracts from a { lon, lat } object', () => {
    expect(extractCoordinatesFromFeature(feature({ coordinates: { lon: 3, lat: 4 } })))
      .toEqual({ lng: 3, lat: 4 })
  })

  it('extracts from an { x, y } object', () => {
    expect(extractCoordinatesFromFeature(feature({ coordinates: { x: 5, y: 6 } })))
      .toEqual({ lng: 5, lat: 6 })
  })

  it('returns null when the geometry has no coordinates property (e.g. GeometryCollection)', () => {
    expect(extractCoordinatesFromFeature(feature({ type: 'GeometryCollection', geometries: [] }))).toBeNull()
  })

  it('returns null when the coordinate values are NaN', () => {
    expect(extractCoordinatesFromFeature(feature({ coordinates: [NaN, 45] }))).toBeNull()
  })

  it('returns null when the coordinate values are not numbers', () => {
    expect(extractCoordinatesFromFeature(feature({ coordinates: ['a', 'b'] }))).toBeNull()
    expect(extractCoordinatesFromFeature(feature({ coordinates: { lng: 'x', lat: 'y' } }))).toBeNull()
  })

  it('returns null for invalid coordinate types', () => {
    expect(extractCoordinatesFromFeature(feature({ coordinates: 'not a coordinate' }))).toBeNull()
  })
})
