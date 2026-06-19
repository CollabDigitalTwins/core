// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Dataset, LayerGeometryType } from '../../../../../types/datasetTypes'
import { DatasetGroup, type OpenDataPortal } from '../../../../../types/dbTypes'
import type { AllGeoJSON } from '@turf/turf'
import { layerColorByName } from '../../utils/stringToColour'

/** Tables our publish pipeline creates; served via the cdt_tiles function source. */
export function isPublishedOrgTable(name: string): boolean {
  return /^org_\d+_file_\d+$/.test(name)
}

/** What a published open-data dataset resolves to: its Martin table + backing File row. */
export interface PublishedCatalogEntry {
  fileId: number
  table: string
  geometryType?: string
}

interface CatalogFileRow {
  id?: number | null
  assetId?: string | null
  description?: string | null
}

/**
 * Build a lookup from `/api/files` of open-data datasets that have already been
 * published to Martin tiles, keyed by `"{portalId}:{datasetId}"` — the identity
 * of the *original* portal dataset.
 *
 * Catalog publishes mint a File whose `assetId` is `odp:{portalId}:{datasetId}`
 * and whose description carries `portalId`/`datasetId` + `tiledTable`. The
 * original portal entry (shown on the National/Applied/All tabs) keeps its own
 * id, so without this map those tabs cannot tell the dataset is already tiled.
 */
export function buildPublishedCatalogMap(rows: CatalogFileRow[]): Map<string, PublishedCatalogEntry> {
  const map = new Map<string, PublishedCatalogEntry>()
  for (const row of rows) {
    if (typeof row?.id !== 'number' || !row.description) continue
    let desc: { source?: unknown, portalId?: unknown, datasetId?: unknown, tiledTable?: unknown, geometryType?: unknown }
    try { desc = JSON.parse(row.description) }
    catch { continue }
    if (desc.source !== 'open-data-portal') continue
    const table = typeof desc.tiledTable === 'string' ? desc.tiledTable : null
    if (!table) continue

    // Prefer the structured fields; fall back to parsing the synthetic assetId.
    let portalId = typeof desc.portalId === 'number' ? String(desc.portalId) : null
    let datasetId = typeof desc.datasetId === 'string' ? desc.datasetId : null
    if ((!portalId || !datasetId) && typeof row.assetId === 'string') {
      const m = /^odp:([^:]+):(.+)$/.exec(row.assetId)
      if (m) { portalId = portalId ?? m[1]; datasetId = datasetId ?? m[2] }
    }
    if (!portalId || !datasetId) continue

    map.set(`${portalId}:${datasetId}`, {
      fileId: row.id,
      table,
      geometryType: typeof desc.geometryType === 'string' ? desc.geometryType : undefined,
    })
  }
  return map
}

/**
 * Tag any dataset whose `portal.id:id` is in the published-catalog map with the
 * `publishedTable`/`publishedFileId` it resolves to, so RowActions renders it as
 * converted (and can un-publish it) wherever it appears — not only on the
 * organizational tab, which is the one place that holds the tiled representation.
 * Datasets that aren't published, or have no portal/id, are returned unchanged.
 */
export function stampPublished(datasets: Dataset[], map: Map<string, PublishedCatalogEntry>): Dataset[] {
  if (map.size === 0) return datasets
  return datasets.map((d) => {
    const portalId = d.portal?.id
    if (portalId == null || d.id == null) return d
    const entry = map.get(`${portalId}:${d.id}`)
    if (!entry) return d
    return { ...d, publishedTable: entry.table, publishedFileId: entry.fileId }
  })
}

export interface PublishedFileRow {
  name?: string | null
  description?: string | null
}

/**
 * Build MVT Dataset entries for published tiles from File-row metadata (/api/files),
 * pointing each at the cdt_tiles function source. The renderer derives source-layer from
 * dataset.id (= the table name = the MVT layer name the function emits), so no serviceInfo
 * is needed. layerType comes from the geometryType stamped at publish time.
 */
export function buildPublishedTileDatasets(
  rows: PublishedFileRow[],
  tileBaseUrl: string,
  portal: OpenDataPortal,
): Dataset[] {
  const base = tileBaseUrl.replace(/\/+$/, '')
  const out: Dataset[] = []
  for (const row of rows) {
    if (!row?.description) continue
    let desc: { tiledTable?: unknown, geometryType?: unknown }
    try { desc = JSON.parse(row.description) }
    catch { continue }
    const table = typeof desc.tiledTable === 'string' ? desc.tiledTable : null
    if (!table) continue

    const name = (row.name ?? table).replace(/\.geojson$/i, '')
    const layerType = (typeof desc.geometryType === 'string' ? desc.geometryType : undefined) as LayerGeometryType | undefined
    const tileUrl = `${base}/cdt_tiles/{z}/{x}/{y}?source=${table}`

    const getFields = async () => []
    const getFeatures = async (): Promise<AllGeoJSON> =>
      ({ type: 'FeatureCollection', features: [] } as AllGeoJSON)

    out.push({
      id: table,
      name,
      publisher: 'Martin Server',
      dataManagementSystem: 'other',
      description: `Published vector tile layer: ${table}`,
      countrySubdivision: portal.countrySubdivision ?? '',
      municipality: portal.municipality ?? '',
      type: 'MVT',
      datasetType: 'MVT',
      url: tileUrl,
      information: tileUrl,
      portal,
      group: DatasetGroup.Organizational,
      layerColor: layerColorByName(name),
      layerType,
      getFields,
      getFeatures,
    } as Dataset)
  }
  return out
}
