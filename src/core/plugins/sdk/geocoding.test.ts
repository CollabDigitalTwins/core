// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Collab Digital Twins

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { autocompleteGeocode, reverseGeocode } from '../../components/viewers/map/utils/geocoding'

import { reverseAddress, searchAddress } from './geocoding'

import type { Feature } from 'geojson'

vi.mock('../../components/viewers/map/utils/geocoding', () => ({
  autocompleteGeocode: vi.fn(),
  reverseGeocode: vi.fn(),
}))

const autocompleteMock = vi.mocked(autocompleteGeocode)
const reverseMock = vi.mocked(reverseGeocode)

const point = (lng: number, lat: number, properties: Record<string, unknown>): Feature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties,
})

beforeEach(() => {
  autocompleteMock.mockReset()
  reverseMock.mockReset()
})

describe('searchAddress', () => {
  it('maps each feature to its label and point position', async () => {
    autocompleteMock.mockResolvedValue([
      point(-70.65, -33.44, { label: 'Plaza de Armas, Santiago, Chile', name: 'Plaza de Armas' }),
      point(-70.6, -33.42, { name: 'Providencia' }),
    ])

    const places = await searchAddress('plaza', { countryCode: 'CL', size: 2 })

    expect(autocompleteMock).toHaveBeenCalledWith('plaza', 'CL', 2)
    expect(places).toEqual([
      { label: 'Plaza de Armas, Santiago, Chile', lng: -70.65, lat: -33.44 },
      { label: 'Providencia', lng: -70.6, lat: -33.42 },
    ])
  })

  it('centres a feature without a point on its bbox and drops one with no position', async () => {
    autocompleteMock.mockResolvedValue([
      { type: 'Feature', geometry: null, bbox: [-71, -34, -70, -33], properties: { label: 'Region' } },
      { type: 'Feature', geometry: null, properties: { label: 'Nowhere' } },
    ])

    expect(await searchAddress('region')).toEqual([{ label: 'Region', lng: -70.5, lat: -33.5 }])
    expect(autocompleteMock).toHaveBeenCalledWith('region', '', 5)
  })

  it('returns [] for blank text without asking the geocoder', async () => {
    expect(await searchAddress('   ')).toEqual([])
    expect(autocompleteMock).not.toHaveBeenCalled()
  })

  it('rejects when the provider chain fails', async () => {
    autocompleteMock.mockRejectedValue(new Error('HTTP error! status: 503'))

    await expect(searchAddress('plaza')).rejects.toThrow('503')
  })
})

describe('reverseAddress', () => {
  it('asks for the single nearest feature at lat/lng and maps it', async () => {
    reverseMock.mockResolvedValue([point(-70.65, -33.44, { label: 'Catedral 1000, Santiago' })])

    const place = await reverseAddress(-70.65, -33.44, { countryCode: 'CL' })

    expect(reverseMock).toHaveBeenCalledWith('-33.44', '-70.65', 'CL', { size: 1 })
    expect(place).toEqual({ label: 'Catedral 1000, Santiago', lng: -70.65, lat: -33.44 })
  })

  it('returns null when nothing is found', async () => {
    reverseMock.mockResolvedValue([])

    expect(await reverseAddress(0, 0)).toBeNull()
  })
})
