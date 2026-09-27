// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { resolveLocationTarget } from './resolveLocationTarget'

import type { ResolveDeps } from './resolveLocationTarget'
import type { Building, Site } from '../../../../../types/dbTypes'
import type { Feature } from 'geojson'

const quebecCity: Feature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-71.21, 46.81] },
  bbox: [-71.55, 46.73, -71.13, 46.98],
  properties: { locality: 'Québec', region_a: 'QC', country_a: 'CA' },
}

const deps = (overrides: Partial<ResolveDeps> = {}): ResolveDeps => ({
  searchPlace: vi.fn(async () => null),
  countryCode: 'CA',
  ...overrides,
})

const params = (query: string) => new URLSearchParams(query)

describe('resolveLocationTarget', () => {
  it('searches the municipality with its parents as context and fits its bbox', async () => {
    const searchPlace = vi.fn(async () => quebecCity)
    const resolved = await resolveLocationTarget(params('municipality=quebec&countrySubdivision=CA-QC&asset=old'), deps({ searchPlace }))

    expect(searchPlace).toHaveBeenCalledWith('municipality', 'quebec', { country: 'CA', countrySubdivision: 'QC' })
    expect(resolved).toEqual({
      level: 'municipality',
      target: { bounds: [-71.55, 46.73, -71.13, 46.98] },
      labels: { country: 'CA', countrySubdivision: 'QC', municipality: 'Québec' },
    })
  })

  it('goes up a level when the finer one finds nothing', async () => {
    const searchPlace = vi.fn(async (level: string) => (level === 'countrySubdivision'
      ? { ...quebecCity, bbox: undefined, properties: { region_a: 'ON' } } as Feature
      : null))
    const resolved = await resolveLocationTarget(params('municipality=nowhereville&countrySubdivision=ON'), deps({ searchPlace }))

    expect(searchPlace).toHaveBeenCalledTimes(2)
    expect(resolved?.level).toBe('countrySubdivision')
    expect(resolved?.target).toEqual({ center: [-71.21, 46.81], zoom: 6 })
    expect(resolved?.labels).toEqual({ country: 'CA', countrySubdivision: 'ON' })
  })

  it('takes the country from the subdivision code over the org country', async () => {
    const searchPlace = vi.fn(async () => null)
    await resolveLocationTarget(params('municipality=London&countrySubdivision=CA-ON'), deps({ searchPlace, countryCode: 'GB' }))

    expect(searchPlace).toHaveBeenNthCalledWith(1, 'municipality', 'London', { country: 'CA', countrySubdivision: 'ON' })
    expect(searchPlace).toHaveBeenNthCalledWith(2, 'countrySubdivision', 'ON', { country: 'CA' })
  })

  it('lets an explicit country param win over the subdivision prefix', async () => {
    const searchPlace = vi.fn(async () => null)
    await resolveLocationTarget(params('country=US&municipality=London&countrySubdivision=CA-ON'), deps({ searchPlace }))

    expect(searchPlace).toHaveBeenNthCalledWith(1, 'municipality', 'London', { country: 'US', countrySubdivision: 'ON' })
  })

  it('never writes a three-letter country code into the labels', async () => {
    const searchPlace = vi.fn(async () => ({ ...quebecCity, properties: { locality: 'London', region_a: 'ON', country_a: 'CAN' } }) as Feature)
    const resolved = await resolveLocationTarget(params('municipality=London&countrySubdivision=CA-ON'), deps({ searchPlace }))

    expect(resolved?.labels.country).toBe('CA')
  })

  it('goes up a level when the provider throws', async () => {
    const searchPlace = vi.fn(async (level: string) => {
      if (level === 'municipality') throw new Error('HTTP 500')
      return quebecCity
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const resolved = await resolveLocationTarget(params('municipality=quebec&countrySubdivision=QC'), deps({ searchPlace }))
    warn.mockRestore()

    expect(resolved?.level).toBe('countrySubdivision')
  })

  it('prefers coordinates over every name', async () => {
    const searchPlace = vi.fn(async () => quebecCity)
    const resolved = await resolveLocationTarget(params('municipality=quebec&lat=45.4&lng=-75.7&zoom=15'), deps({ searchPlace }))

    expect(searchPlace).not.toHaveBeenCalled()
    expect(resolved).toEqual({ level: 'latlng', target: { center: [-75.7, 45.4], zoom: 15 }, labels: { municipality: 'quebec' } })
  })

  it('flies to a building record, falling back to the site when it has no coordinates', async () => {
    const building = { id: 9, buildingLongitude: -75.69, buildingLatitude: 45.42, buildingMunicipality: 'Ottawa' } as Building
    const site = { id: 4, siteLongitude: -75.7, siteLatitude: 45.4 } as Site

    const onBuilding = await resolveLocationTarget(params('buildingId=9&site=4'), deps({ building, site }))
    expect(onBuilding?.target).toEqual({ center: [-75.69, 45.42], zoom: 18 })
    expect(onBuilding?.labels).toEqual({ buildingId: '9', site: '4', municipality: 'Ottawa' })

    const onSite = await resolveLocationTarget(params('buildingId=9&site=4'), deps({ building: { id: 9 } as Building, site }))
    expect(onSite).toEqual({ level: 'site', target: { center: [-75.7, 45.4], zoom: 16 }, labels: { site: '4' } })
  })

  it('returns null when nothing resolves', async () => {
    expect(await resolveLocationTarget(params('asset=3&viewer=map'), deps())).toBeNull()
  })
})
