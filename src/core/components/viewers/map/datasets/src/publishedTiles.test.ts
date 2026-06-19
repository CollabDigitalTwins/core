// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { isPublishedOrgTable, buildPublishedTileDatasets, buildPublishedCatalogMap, stampPublished } from './publishedTiles'
import type { Dataset } from '../../../../../types/datasetTypes'

const portal = { id: 1, name: 'Martin', group: 'national' } as never

describe('isPublishedOrgTable', () => {
  it('matches org_<n>_file_<n>', () => {
    expect(isPublishedOrgTable('org_2_file_526')).toBe(true)
  })
  it('rejects other names', () => {
    expect(isPublishedOrgTable('canada_provinces')).toBe(false)
    expect(isPublishedOrgTable('cdt_tiles')).toBe(false)
  })
})

describe('buildPublishedTileDatasets', () => {
  const rows = [
    { name: 'Ottawa Boundary.geojson', description: JSON.stringify({ tiledTable: 'org_2_file_5', geometryType: 'fill' }) },
    { name: 'No marker', description: JSON.stringify({ bucket: 'x' }) },
    { name: 'Bad', description: '{not json' },
  ]

  it('builds one MVT dataset per row carrying tiledTable', () => {
    const out = buildPublishedTileDatasets(rows, 'https://martin.example/', portal)
    expect(out).toHaveLength(1)
    const d = out[0]
    expect(d.id).toBe('org_2_file_5')
    expect(d.datasetType).toBe('MVT')
    expect(d.layerType).toBe('fill')
    expect(d.name).toBe('Ottawa Boundary')
    expect(d.url).toBe('https://martin.example/cdt_tiles/{z}/{x}/{y}?source=org_2_file_5')
  })

  it('returns [] when no rows carry a tiledTable', () => {
    expect(buildPublishedTileDatasets([{ name: 'x', description: '{}' }], 'https://m/', portal)).toEqual([])
  })
})

describe('buildPublishedCatalogMap', () => {
  it('keys published open-data files by portalId:datasetId from description fields', () => {
    const rows = [
      {
        id: 7,
        assetId: 'odp:3:abc-123',
        description: JSON.stringify({ source: 'open-data-portal', portalId: 3, datasetId: 'abc-123', tiledTable: 'org_2_file_7', geometryType: 'fill' }),
      },
    ]
    const map = buildPublishedCatalogMap(rows)
    expect(map.get('3:abc-123')).toEqual({ fileId: 7, table: 'org_2_file_7', geometryType: 'fill' })
  })

  it('falls back to parsing the synthetic assetId when description lacks the ids', () => {
    const rows = [
      { id: 9, assetId: 'odp:4:ds:with:colons', description: JSON.stringify({ source: 'open-data-portal', tiledTable: 'org_2_file_9' }) },
    ]
    const map = buildPublishedCatalogMap(rows)
    // datasetId keeps everything after the second colon
    expect(map.get('4:ds:with:colons')).toEqual({ fileId: 9, table: 'org_2_file_9', geometryType: undefined })
  })

  it('skips rows that are not published, not open-data, or malformed', () => {
    const rows = [
      { id: 1, assetId: 'odp:3:x', description: JSON.stringify({ source: 'open-data-portal', portalId: 3, datasetId: 'x' }) }, // no tiledTable
      { id: 2, assetId: '2/minio-key', description: JSON.stringify({ bucket: 'b', tiledTable: 'org_2_file_2' }) }, // not open-data
      { id: 3, assetId: 'odp:3:y', description: '{not json' }, // malformed
      { assetId: 'odp:3:z', description: JSON.stringify({ source: 'open-data-portal', portalId: 3, datasetId: 'z', tiledTable: 'org_2_file_3' }) }, // no id
    ]
    expect(buildPublishedCatalogMap(rows).size).toBe(0)
  })
})

describe('stampPublished', () => {
  const ds = (id: string, portalId: number | undefined): Dataset =>
    ({ id, name: id, portal: portalId == null ? undefined : { id: portalId } } as never)

  it('tags datasets whose portal.id:id is published, leaving others untouched', () => {
    const map = buildPublishedCatalogMap([
      { id: 7, assetId: 'odp:3:abc', description: JSON.stringify({ source: 'open-data-portal', portalId: 3, datasetId: 'abc', tiledTable: 'org_2_file_7' }) },
    ])
    const [hit, miss, noPortal] = stampPublished([ds('abc', 3), ds('def', 3), ds('abc', undefined)], map)
    expect(hit.publishedTable).toBe('org_2_file_7')
    expect(hit.publishedFileId).toBe(7)
    expect(miss.publishedFileId).toBeUndefined()
    expect(noPortal.publishedFileId).toBeUndefined()
  })

  it('returns the input array unchanged when the map is empty', () => {
    const input = [ds('abc', 3)]
    expect(stampPublished(input, new Map())).toBe(input)
  })
})
