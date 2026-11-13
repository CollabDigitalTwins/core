// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { createUrlDatasetFile, fileIdFromOrgDatasetId, orgFileDatasetId, urlDatasetRow } from './orgDatasetFiles'

describe('org dataset ids', () => {
  it('round-trips a file id', () => {
    expect(fileIdFromOrgDatasetId(orgFileDatasetId(17))).toBe(17)
  })

  it('returns null for ids that are not org files', () => {
    expect(fileIdFromOrgDatasetId('local-123')).toBeNull()
    expect(fileIdFromOrgDatasetId(5)).toBeNull()
    expect(fileIdFromOrgDatasetId('org-minio-abc')).toBeNull()
  })
})

describe('urlDatasetRow', () => {
  it('stores the source so the dataset can be rebuilt', () => {
    const row = urlDatasetRow('Parcels', { sourceUrl: 'https://x.test/wms', serviceType: 'wms', layer: 'p' })
    expect(row.description).toMatchObject({ sourceUrl: 'https://x.test/wms', serviceType: 'wms', layer: 'p' })
    expect(row.assetId).toMatch(/^url-/)
  })
})

describe('createUrlDatasetFile', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('saves the URL row as a tagged organization map file', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ newFile: { id: 7 } }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(createUrlDatasetFile('Parks', { sourceUrl: 'https://x.test/parks.geojson', serviceType: 'geojson' }, 'polygons')).resolves.toBe(7)

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toMatchObject({ name: 'Parks', type: 'map-file', tag: 'organizational-dataset', extension: 'url' })
    expect(JSON.parse(body.description)).toEqual({ sourceUrl: 'https://x.test/parks.geojson', serviceType: 'geojson', geometryType: 'polygons' })
  })
})
