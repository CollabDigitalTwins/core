// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { parseBbox, parseLngLat, presentLevels } from './locationTarget'

const params = (query: string) => new URLSearchParams(query)

describe('presentLevels', () => {
  it('orders every level in the URL finest first', () => {
    expect(presentLevels(params('country=CA&countrySubdivision=QC&municipality=quebec&address=1 Rue&site=4&buildingId=9&bbox=-72,46,-71,47&lat=46.8&lng=-71.2')))
      .toEqual(['latlng', 'bbox', 'buildingId', 'address', 'site', 'municipality', 'countrySubdivision', 'country'])
  })

  it('picks the name when there are no coordinates', () => {
    expect(presentLevels(params('municipality=quebec&zoom=10'))[0]).toBe('municipality')
  })

  it('skips invalid values so the next level up wins', () => {
    expect(presentLevels(params('lat=abc&lng=-71&bbox=1,2,3&buildingId=x&site=&municipality=quebec'))).toEqual(['municipality'])
  })

  it('never targets asset', () => {
    expect(presentLevels(params('asset=12&countrySubdivision=ON'))).toEqual(['countrySubdivision'])
  })

  it('ignores zoom, bearing and pitch on their own', () => {
    expect(presentLevels(params('zoom=10&bearing=5&pitch=30&viewer=map'))).toEqual([])
  })
})

describe('parseLngLat', () => {
  it('rejects null island and out-of-range values', () => {
    expect(parseLngLat(params('lat=0&lng=0'))).toBeNull()
    expect(parseLngLat(params('lat=95&lng=10'))).toBeNull()
    expect(parseLngLat(params('lat=45.4&lng=-75.7'))).toEqual([-75.7, 45.4])
  })
})

describe('parseBbox', () => {
  it('accepts west,south,east,north only when ordered', () => {
    expect(parseBbox('-76,45,-75,46')).toEqual([-76, 45, -75, 46])
    expect(parseBbox('-75,45,-76,46')).toBeNull()
    expect(parseBbox(null)).toBeNull()
  })
})
