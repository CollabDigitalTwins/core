// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { fetchOrganizationalMinioDatasets } from './minioDatasets'

const realFetch = global.fetch
const ORIG_ENV = process.env.NEXT_PUBLIC_MINIO_BUCKET_URL

beforeEach(() => {
  process.env.NEXT_PUBLIC_MINIO_BUCKET_URL = 'https://minio.example.com/'
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  global.fetch = realFetch
  if (ORIG_ENV === undefined) delete process.env.NEXT_PUBLIC_MINIO_BUCKET_URL
  else process.env.NEXT_PUBLIC_MINIO_BUCKET_URL = ORIG_ENV
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

  it('skips rows without an assetId or bucket', async () => {
    mockFilesFetch([
      { ...validRow, assetId: null },
      { ...validRow, description: JSON.stringify({ geometryType: 'lines' }) },
      { ...validRow, description: 'not json' },
    ])
    await expect(fetchOrganizationalMinioDatasets(7)).resolves.toEqual([])
  })

  it('builds the source URL using the bucket, org id, and asset id', async () => {
    mockFilesFetch([validRow])
    const [ds] = await fetchOrganizationalMinioDatasets(42)
    expect(ds.sourceUrl).toBe('https://minio.example.com/datasets/42/asset-123')
    expect(ds.url).toBe(ds.sourceUrl)
  })

  it('strips .geojson from the name and falls back to "Dataset {id}"', async () => {
    mockFilesFetch([
      validRow,
      { ...validRow, id: 2, assetId: 'asset-2', name: null },
    ])
    const datasets = await fetchOrganizationalMinioDatasets(42)
    expect(datasets[0].name).toBe('roads')
    expect(datasets[1].name).toBe('Dataset 2')
  })

  it('maps geometryType to layerType', async () => {
    mockFilesFetch([
      { ...validRow, id: 1, assetId: 'a', description: JSON.stringify({ bucket: 'b', geometryType: 'lines' }) },
      { ...validRow, id: 2, assetId: 'b', description: JSON.stringify({ bucket: 'b', geometryType: 'points' }) },
      { ...validRow, id: 3, assetId: 'c', description: JSON.stringify({ bucket: 'b', geometryType: 'polygons' }) },
      { ...validRow, id: 4, assetId: 'd', description: JSON.stringify({ bucket: 'b' }) },
    ])
    const datasets = await fetchOrganizationalMinioDatasets(42)
    expect(datasets.map(d => d.layerType)).toEqual(['line', 'circle', 'fill', undefined])
  })

  it('returns [] when the env var is missing', async () => {
    delete process.env.NEXT_PUBLIC_MINIO_BUCKET_URL
    mockFilesFetch([validRow])
    await expect(fetchOrganizationalMinioDatasets(42)).resolves.toEqual([])
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
