// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { newBuildingData } from './newBuilding'

describe('newBuildingData', () => {
  it('places an address-only building at its point', () => {
    const data = newBuildingData({ name: 'Tory', placement: { lng: -75.7, lat: 45.38 }, address: { buildingAddress: '1 Main St' } })

    expect(data).toEqual({
      buildingName: 'Tory',
      buildingType: ['Other'],
      buildingLongitude: -75.7,
      buildingLatitude: 45.38,
      buildingAddress: '1 Main St',
    })
  })

  it('links a picked footprint by its OSM id', () => {
    const data = newBuildingData({ name: '', placement: { lng: 1, lat: 2, osmId: '123' }, address: {} })

    expect(data.buildingOsmId).toBe('123')
    expect(data.buildingGeometry).toBeUndefined()
  })

  it('stores a drawn footprint as a closed polygon', () => {
    const ring: [number, number][] = [[0, 0], [1, 0], [1, 1]]
    const data = newBuildingData({ name: '', placement: { lng: 0.5, lat: 0.5, ring }, address: {} })

    expect(data.buildingGeometry).toEqual({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] })
  })

  it('names an unnamed building after its address', () => {
    const data = newBuildingData({ name: '  ', placement: { lng: 0, lat: 0 }, address: { buildingAddress: '1 Main St, Ottawa' } })

    expect(data.buildingName).toBe('1 Main St')
  })
})
