// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { afterEach, describe, expect, it, vi } from 'vitest'

import { arcgisLayerSource, arcgisLayerUrl, fetchLayerFeatures, layerFields } from './arcgisLayer'
import { describeLoadError } from './loadErrors'

const LAYER = 'https://x/arcgis/rest/services/Parcels/FeatureServer/0'
const feature = (id: number) => ({ type: 'Feature', id, geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} })
const json = (body: unknown) => new Response(JSON.stringify(body))

afterEach(() => vi.unstubAllGlobals())

describe('fetchLayerFeatures', () => {
  it('pages at the layer maxRecordCount until every counted feature is loaded', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const params = new URL(url).searchParams
      if (params.get('returnCountOnly')) return json({ count: 5 })
      const offset = Number(params.get('resultOffset'))
      return json({ features: [0, 1].map(i => feature(offset + i)).filter(f => (f.id as number) < 5), exceededTransferLimit: offset + 2 < 5 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchLayerFeatures(LAYER, { maxRecordCount: 2 })
    expect(result.features.map(f => f.id)).toEqual([0, 1, 2, 3, 4])
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('resultOffset'))).toHaveLength(3)
  })

  it('asks for line and polygon geometry simplified to the tolerance, in small pages', async () => {
    const fetchMock = vi.fn(async (url: string) => (new URL(url).searchParams.get('returnCountOnly') ? json({ count: 3 }) : json({ features: [feature(1)] })))
    vi.stubGlobal('fetch', fetchMock)
    await fetchLayerFeatures(LAYER, { maxRecordCount: 2_000, geometryType: 'esriGeometryPolygon' }, { tolerance: 0.001 })
    const page = new URL(fetchMock.mock.calls.map(([url]) => url).find(url => url.includes('resultOffset')) ?? '').searchParams
    expect(page.get('maxAllowableOffset')).toBe('0.001')
    expect(page.get('outSR')).toBe('4326')
    expect(Number(page.get('resultRecordCount'))).toBeLessThanOrEqual(100)
  })

  it('leaves point geometry and page size alone', async () => {
    const fetchMock = vi.fn(async (url: string) => (new URL(url).searchParams.get('returnCountOnly') ? json({ count: 3 }) : json({ features: [feature(1)] })))
    vi.stubGlobal('fetch', fetchMock)
    await fetchLayerFeatures(LAYER, { maxRecordCount: 2_000, geometryType: 'esriGeometryPoint' }, { tolerance: 0.001 })
    const page = new URL(fetchMock.mock.calls.map(([url]) => url).find(url => url.includes('resultOffset')) ?? '').searchParams
    expect(page.get('maxAllowableOffset')).toBeNull()
    expect(page.get('resultRecordCount')).toBe('2000')
  })

  it('falls back to object id batches when the server cannot page', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const params = new URL(url).searchParams
      if (params.get('returnIdsOnly')) return json({ objectIds: [7, 8, 9] })
      return json({ features: (params.get('objectIds') ?? '').split(',').map(Number).map(feature) })
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchLayerFeatures(LAYER, { advancedQueryCapabilities: { supportsPagination: false } })
    expect(result.features.map(f => f.id)).toEqual([7, 8, 9])
  })

  it('surfaces an ArcGIS error body instead of returning an empty layer', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('returnCountOnly') ? json({ count: 1 }) : json({ error: { message: 'Token Required' } }))))
    await expect(fetchLayerFeatures(LAYER, null)).rejects.toThrow('Token Required')
  })
})

describe('layer helpers', () => {
  it('defaults a service URL to its first layer', () => {
    expect(arcgisLayerUrl('https://x/rest/services/P/FeatureServer')).toBe('https://x/rest/services/P/FeatureServer/0')
    expect(arcgisLayerUrl('https://x/rest/services/P/MapServer/4/?f=json')).toBe('https://x/rest/services/P/MapServer/4')
  })

  it('keeps aliases and only date and id type hints', () => {
    expect(layerFields({ fields: [
      { name: 'OBJECTID', type: 'esriFieldTypeOID' },
      { name: 'BUILT', type: 'esriFieldTypeDate', alias: 'Year built' },
      { name: 'AREA', type: 'esriFieldTypeDouble', alias: 'AREA' },
    ] })).toEqual([
      { name: 'OBJECTID', type: 'id', alias: undefined },
      { name: 'BUILT', type: 'datetime', alias: 'Year built' },
      { name: 'AREA', type: undefined, alias: undefined },
    ])
  })
})

describe('checking an ArcGIS layer before it is added', () => {
  const layerServer = (query: () => Response) => vi.fn(async (url: string) => (url.includes('/query?') ? query() : json({ name: 'Parcels', fields: [] })))
  const probe = (layer: string) => arcgisLayerSource(`https://probe.example.org/arcgis/rest/services/${layer}/FeatureServer/0`, layer).probe?.()

  it('passes a layer that returns a feature', async () => {
    vi.stubGlobal('fetch', layerServer(() => json({ type: 'FeatureCollection', features: [feature(1)] })))
    await expect(probe('Open')).resolves.toBeUndefined()
  })

  it('rejects a secured layer as permanently forbidden', async () => {
    vi.stubGlobal('fetch', layerServer(() => json({ error: { code: 499, message: 'Token Required' } })))
    const error = await probe('Secured').catch((e: unknown) => e)
    expect(describeLoadError(error)).toEqual({ reason: 'forbidden', permanent: true })
  })

  it('rejects a layer whose query is refused', async () => {
    vi.stubGlobal('fetch', layerServer(() => new Response('', { status: 403 })))
    const error = await probe('Refused').catch((e: unknown) => e)
    expect(describeLoadError(error).reason).toBe('forbidden')
  })

  it('rejects a layer whose metadata cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 400, message: 'Invalid URL' } })))
    await expect(probe('Missing')).rejects.toThrow()
  })
})
