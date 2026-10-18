// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { afterEach, describe, expect, it, vi } from 'vitest'

import { classifyResource, fetchCkanDatasets, hubLayerUrl, pickResource, recordToFeature, type CkanResource } from './ckanDatasets'

import type { OpenDataPortal } from '../../../../../types/dbTypes'

const resource = (overrides: Partial<CkanResource>): CkanResource => ({ id: 'r', url: 'https://x/data', ...overrides })

afterEach(() => vi.unstubAllGlobals())

describe('classifyResource', () => {
  it('recognises each loadable kind', () => {
    expect(classifyResource(resource({ datastore_active: 'true', format: 'CSV' }))).toBe('datastore')
    expect(classifyResource(resource({ url: 'https://x/arcgis/rest/services/Parks/FeatureServer/2' }))).toBe('arcgis')
    expect(classifyResource(resource({ format: 'WFS', url: 'https://x/wfs?typeName=parks' }))).toBe('wfs')
    expect(classifyResource(resource({ format: 'GeoJSON' }))).toBe('geojson')
    expect(classifyResource(resource({ format: 'WMS' }))).toBe('wms')
  })

  it('skips a WFS without a layer name and formats it cannot draw', () => {
    expect(classifyResource(resource({ format: 'WFS', url: 'https://x/wfs?request=GetCapabilities' }))).toBeNull()
    expect(classifyResource(resource({ format: 'PDF' }))).toBeNull()
  })
})

describe('pickResource', () => {
  it('prefers a live service over the datastore, and the datastore over a file', () => {
    const picked = pickResource([
      resource({ id: 'file', format: 'GeoJSON' }),
      resource({ id: 'store', datastore_active: true }),
      resource({ id: 'service', format: 'Esri REST', url: 'https://x/FeatureServer/0' }),
    ])
    expect(picked?.resource.id).toBe('service')
    expect(pickResource([resource({ id: 'file', format: 'GeoJSON' }), resource({ id: 'store', datastore_active: true })])?.kind).toBe('datastore')
  })

  it('ignores deleted resources', () => {
    expect(pickResource([resource({ format: 'GeoJSON', state: 'deleted' })])).toBeNull()
  })
})

describe('recordToFeature', () => {
  it('reads a GeoJSON geometry column, even as a string, and drops it from the properties', () => {
    const feature = recordToFeature({ _id: 1, name: 'Park', geometry: '{"type":"Point","coordinates":[-75,45]}' })
    expect(feature).toEqual({ type: 'Feature', geometry: { type: 'Point', coordinates: [-75, 45] }, properties: { _id: 1, name: 'Park' } })
  })

  it('falls back to latitude and longitude columns', () => {
    expect(recordToFeature({ Latitude: '45.4', Longitude: '-75.7' })?.geometry).toEqual({ type: 'Point', coordinates: [-75.7, 45.4] })
  })

  it('returns null for rows without a usable location', () => {
    expect(recordToFeature({ name: 'x' })).toBeNull()
    expect(recordToFeature({ lat: 'n/a', lon: '-75' })).toBeNull()
  })
})

describe('hubLayerUrl', () => {
  it('maps an ArcGIS Hub download link back to its FeatureServer layer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ url: 'https://services.arcgis.com/a/arcgis/rest/services/Parks/FeatureServer' }))))
    expect(await hubLayerUrl('https://opendata.arcgis.com/datasets/0123456789abcdef0123456789abcdef_3.geojson'))
      .toBe('https://services.arcgis.com/a/arcgis/rest/services/Parks/FeatureServer/3')
  })

  it('leaves other URLs alone', async () => {
    expect(await hubLayerUrl('https://example.com/parks.geojson')).toBeNull()
  })
})

describe('checking a CKAN GeoJSON file before it is added', () => {
  const portal = { id: 7, name: 'City', apiUrl: 'https://ckan.example.org' } as unknown as OpenDataPortal
  const fileServer = (head: () => Response) => vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'HEAD') return head()
    const pkg = { id: `pkg-${url.length}`, name: 'parks', title: 'Parks', resources: [{ id: 'file', format: 'GeoJSON', url: 'https://files.example.org/parks.geojson' }] }
    return new Response(JSON.stringify({ success: true, result: { count: 1, results: [pkg] } }))
  })
  const parksDataset = async () => (await fetchCkanDatasets(portal))[0]

  it('rejects a file the publisher refuses to serve', async () => {
    vi.stubGlobal('fetch', fileServer(() => new Response(null, { status: 403 })))
    await expect((await parksDataset()).probe?.()).rejects.toThrow(/403/)
  })

  it('rejects a file too large to draw directly', async () => {
    vi.stubGlobal('fetch', fileServer(() => new Response(null, { headers: { 'content-length': String(200 * 1024 * 1024) } })))
    await expect((await parksDataset()).probe?.()).rejects.toThrow(/vector tiles/)
  })

  it('passes a readable file and checks it only once', async () => {
    const fetch = fileServer(() => new Response(null, { headers: { 'content-length': '2048' } }))
    vi.stubGlobal('fetch', fetch)
    const dataset = await parksDataset()
    await dataset.probe?.()
    await dataset.probe?.()
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'HEAD')).toHaveLength(1)
  })
})
