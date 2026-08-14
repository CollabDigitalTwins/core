// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { fetchOrganizationalMinioDatasets } from './minioDatasets'

const realFetch = global.fetch
const PRESIGNED = 'https://minio.example.com/datasets/42/asset-123?X-Amz-Signature=abc'

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  global.fetch = realFetch
  vi.restoreAllMocks()
})

function mockFilesFetch(files: unknown[]) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url === '/api/files') {
      return Promise.resolve({ ok: true, json: async () => ({ files }) })
    }
    return Promise.reject(new Error(`unexpected url ${url}`))
  }) as unknown as typeof fetch
}

const validRow = {
  id: 1,
  type: 'map-file',
  tag: 'organizational-dataset',
  name: 'roads.geojson',
  assetId: 'asset-123',
  url: PRESIGNED,
  description: JSON.stringify({ bucket: 'datasets', geometryType: 'lines' }),
  uploadedAt: '2025-01-01',
}

describe('fetchOrganizationalMinioDatasets', () => {
  it('returns [] when /api/files responds non-ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }) as any
    await expect(fetchOrganizationalMinioDatasets(7)).resolves.toEqual([])
  })

  it('returns [] when /api/files throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('net down')) as any
    await expect(fetchOrganizationalMinioDatasets(7)).resolves.toEqual([])
  })

  it('skips rows with the wrong type or tag', async () => {
    mockFilesFetch([
      { ...validRow, type: 'other' },
      { ...validRow, tag: 'other' },
    ])
    await expect(fetchOrganizationalMinioDatasets(7)).resolves.toEqual([])
  })

  it('reads the source URL from the row rather than building one', async () => {
    mockFilesFetch([validRow])
    const [ds] = await fetchOrganizationalMinioDatasets(42)
    expect(ds.sourceUrl).toBe(PRESIGNED)
    expect(ds.url).toBe(PRESIGNED)
  })

  it('skips a row with no URL instead of guessing the object path', async () => {
    mockFilesFetch([{ ...validRow, url: undefined }])
    await expect(fetchOrganizationalMinioDatasets(42)).resolves.toEqual([])
  })

  it('keeps a row whose description records no bucket', async () => {
    mockFilesFetch([{ ...validRow, description: JSON.stringify({ geometryType: 'lines' }) }])
    const datasets = await fetchOrganizationalMinioDatasets(42)
    expect(datasets).toHaveLength(1)
  })

  it('suppresses a row whose tiled table is already served', async () => {
    mockFilesFetch([{ ...validRow, description: JSON.stringify({ tiledTable: 'org_42_file_1' }) }])
    await expect(fetchOrganizationalMinioDatasets(42, new Set(['org_42_file_1']))).resolves.toEqual([])
  })

  it('stamps each dataset with the organization it was fetched for', async () => {
    mockFilesFetch([validRow])
    const [ds] = await fetchOrganizationalMinioDatasets(42)
    expect(ds.organization).toBe(42)
  })

  it('strips .geojson from the name and falls back to "Dataset {id}"', async () => {
    mockFilesFetch([
      validRow,
      { ...validRow, id: 2, name: null },
    ])
    const datasets = await fetchOrganizationalMinioDatasets(42)
    expect(datasets[0].name).toBe('roads')
    expect(datasets[1].name).toBe('Dataset 2')
  })

  it('maps geometryType to layerType', async () => {
    mockFilesFetch([
      { ...validRow, id: 1, description: JSON.stringify({ geometryType: 'lines' }) },
      { ...validRow, id: 2, description: JSON.stringify({ geometryType: 'points' }) },
      { ...validRow, id: 3, description: JSON.stringify({ geometryType: 'polygons' }) },
      { ...validRow, id: 4, description: JSON.stringify({}) },
    ])
    const datasets = await fetchOrganizationalMinioDatasets(42)
    expect(datasets.map(d => d.layerType)).toEqual(['line', 'circle', 'fill', undefined])
  })

  it('caches getFeatures on the second call', async () => {
    mockFilesFetch([validRow])
    const [ds] = await fetchOrganizationalMinioDatasets(42)

    const features = { type: 'FeatureCollection', features: [] }
    const downstreamFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => features })
    global.fetch = downstreamFetch as any

    await expect(ds.getFeatures()).resolves.toEqual(features)
    await expect(ds.getFeatures()).resolves.toEqual(features)
    expect(downstreamFetch).toHaveBeenCalledTimes(1)
  })

  it('getFeatures throws when MinIO returns non-ok', async () => {
    mockFilesFetch([validRow])
    const [ds] = await fetchOrganizationalMinioDatasets(42)

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }) as any
    await expect(ds.getFeatures()).rejects.toThrow(/403/)
  })
})
