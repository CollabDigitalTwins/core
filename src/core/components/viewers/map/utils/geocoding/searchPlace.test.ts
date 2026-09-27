// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setGeocodingConfig } from './config'

import { searchPlace } from './index'

const respond = (body: unknown) => vi.fn(async (_url: string) => ({ ok: true, json: async () => body }))

const requestedParams = (fetchMock: ReturnType<typeof respond>) =>
  new URL(fetchMock.mock.calls[0][0]).searchParams

afterEach(() => {
  vi.unstubAllGlobals()
  setGeocodingConfig({})
})

describe('searchPlace via Pelias', () => {
  it('restricts a municipality search to locality layers and returns the first feature', async () => {
    setGeocodingConfig({ geocoderUrl: 'https://pelias.test' })
    const fetchMock = respond({ features: [{ id: 'first' }, { id: 'second' }] })
    vi.stubGlobal('fetch', fetchMock)

    const feature = await searchPlace('municipality', 'quebec', { country: 'CA', countrySubdivision: 'QC' })

    expect(fetchMock.mock.calls[0][0]).toContain('https://pelias.test/v1/search/structured?')
    expect(Object.fromEntries(requestedParams(fetchMock))).toEqual({
      'size': '5',
      'layers': 'locality,localadmin',
      'country': 'CA',
      'region': 'QC',
      'locality': 'quebec',
      'boundary.country': 'CA',
    })
    expect(feature).toEqual({ id: 'first' })
  })

  it('skips candidates in another subdivision and takes the first one inside it', async () => {
    setGeocodingConfig({ geocoderUrl: 'https://pelias.test' })
    vi.stubGlobal('fetch', respond({ features: [
      { id: 'london-uk', properties: { region: 'England' } },
      { id: 'london-on', properties: { region_a: 'ON', region: 'Ontario' } },
      { id: 'london-on-2', properties: { region_a: 'ON' } },
    ] }))

    expect(await searchPlace('municipality', 'London', { country: 'CA', countrySubdivision: 'ON' })).toMatchObject({ id: 'london-on' })
  })

  it('returns null when no candidate lies inside the subdivision', async () => {
    setGeocodingConfig({ geocoderUrl: 'https://pelias.test' })
    vi.stubGlobal('fetch', respond({ features: [{ id: 'london-uk', properties: { region_a: 'ENG', region: 'England' } }] }))

    expect(await searchPlace('municipality', 'London', { countrySubdivision: 'ON' })).toBeNull()
  })

  it('matches a subdivision name without accents', async () => {
    setGeocodingConfig({ geocoderUrl: 'https://pelias.test' })
    vi.stubGlobal('fetch', respond({ features: [{ id: 'qc', properties: { region: 'Québec' } }] }))

    expect(await searchPlace('municipality', 'Gatineau', { countrySubdivision: 'Quebec' })).toMatchObject({ id: 'qc' })
  })

  it('does not bound a country search to the org country', async () => {
    setGeocodingConfig({ geocoderUrl: 'https://pelias.test' })
    const fetchMock = respond({ features: [] })
    vi.stubGlobal('fetch', fetchMock)

    expect(await searchPlace('country', 'France')).toBeNull()
    expect(requestedParams(fetchMock).get('layers')).toBe('country')
    expect(requestedParams(fetchMock).has('boundary.country')).toBe(false)
  })
})

describe('searchPlace via Nominatim', () => {
  it('uses a structured settlement search with the subdivision code expanded', async () => {
    const fetchMock = respond([{ lat: '46.81', lon: '-71.21', boundingbox: ['46.73', '46.98', '-71.55', '-71.13'], address: { city: 'Québec', 'ISO3166-2-lvl4': 'CA-QC', country_code: 'ca' } }])
    vi.stubGlobal('fetch', fetchMock)

    const feature = await searchPlace('municipality', 'quebec', { country: 'CA', countrySubdivision: 'QC' })

    expect(fetchMock.mock.calls[0][0]).toContain('https://nominatim.openstreetmap.org/search?')
    expect(Object.fromEntries(requestedParams(fetchMock))).toEqual({
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'ca',
      state: 'quebec',
      city: 'quebec',
      featureType: 'settlement',
    })
    expect(feature?.bbox).toEqual([-71.55, 46.73, -71.13, 46.98])
    expect(feature?.properties).toMatchObject({ locality: 'Québec', region_a: 'QC', country_a: 'CA' })
  })

  it('falls back to Nominatim when Pelias fails', async () => {
    setGeocodingConfig({ geocoderUrl: 'https://pelias.test' })
    const fetchMock = vi.fn(async (url: string) => (url.includes('pelias.test')
      ? { ok: false, status: 500, json: async () => ({}) }
      : { ok: true, json: async () => [] }))
    vi.stubGlobal('fetch', fetchMock)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(await searchPlace('countrySubdivision', 'ON', { country: 'CA' })).toBeNull()
    warn.mockRestore()

    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('featureType')).toBe('state')
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('state')).toBe('ontario')
  })
})
