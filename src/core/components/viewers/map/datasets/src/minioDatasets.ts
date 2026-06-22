// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Dataset } from '../../../../../types/datasetTypes'
import { DatasetGroup } from '../../../../../types/dbTypes'
import { layerColorByName } from '../../utils/stringToColour'
import type { AllGeoJSON } from '@turf/turf'

/**
 * Hydrates uploaded GeoJSON datasets persisted via "Add Dataset". Looks up
 * File rows tagged `organizational-dataset`, reads the bucket from each row's
 * description JSON, and builds Dataset entries whose `getFeatures` lazy-loads
 * the GeoJSON from MinIO on first render.
 */

interface OrgDatasetDescription {
  bucket?: string
  geometryType?: 'points' | 'lines' | 'polygons'
  layerStyles?: Record<string, Record<string, string | number>>
  tiledTable?: string
  tiledAt?: string
  featuresIngested?: number
  featuresSkipped?: number
}

interface RawFileRow {
  id: number
  type?: string | null
  tag?: string | null
  name?: string | null
  assetId?: string | null
  description?: string | null
  uploadedAt?: string | Date | null
}

const TAG = 'organizational-dataset'

function parseDescription(value: string | null | undefined): OrgDatasetDescription | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null ? parsed as OrgDatasetDescription : null
  }
  catch {
    return null
  }
}

function buildMinioUrl(bucket: string, organizationId: number, assetId: string): string | null {
  const base = process.env.NEXT_PUBLIC_MINIO_BUCKET_URL
  if (!base) return null
  return `${base.replace(/\/+$/, '')}/${bucket}/${organizationId}/${assetId}`
}

export async function fetchOrganizationalMinioDatasets(
  organizationId: number,
  publishedTilesInCatalog: ReadonlySet<string> = new Set(),
): Promise<Dataset[]> {
  let rows: RawFileRow[] = []
  try {
    const res = await fetch('/api/files')
    if (!res.ok) {
      console.warn(`fetchOrganizationalMinioDatasets: /api/files returned ${res.status}`)
      return []
    }
    const body = await res.json()
    rows = Array.isArray(body?.files) ? body.files : []
  }
  catch (err) {
    console.warn('fetchOrganizationalMinioDatasets: /api/files request failed', err)
    return []
  }

  const datasets: Dataset[] = []
  for (const row of rows) {
    if (row.type !== 'map-file') continue
    if (row.tag !== TAG) continue
    if (!row.assetId) continue

    const meta = parseDescription(row.description)
    // Suppress the MinIO entry only once Martin actually serves the published
    // table — otherwise the file appears to vanish during the publish→restart
    // gap. Un-publish drops the table immediately, so the MinIO row reappears
    // on next reload with no extra plumbing.
    if (meta?.tiledTable && publishedTilesInCatalog.has(meta.tiledTable)) continue
    const bucket = meta?.bucket
    if (!bucket) continue

    const sourceUrl = buildMinioUrl(bucket, organizationId, row.assetId)
    if (!sourceUrl) continue

    const name = row.name?.replace(/\.geojson$/i, '') || `Dataset ${row.id}`
    const id = `org-minio-${row.id}`
    let cached: AllGeoJSON | null = null

    const getFeatures = async (): Promise<AllGeoJSON> => {
      if (cached) return cached
      const response = await fetch(sourceUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch GeoJSON from ${sourceUrl}: ${response.status}`)
      }
      cached = await response.json() as AllGeoJSON
      return cached
    }

    const getFields = async () => []

    datasets.push({
      id,
      name,
      type: 'Organizational',
      publisher: 'Organizational',
      license: 'Unknown',
      contact: 'Unknown',
      description: `Uploaded ${row.uploadedAt ?? ''}`.trim(),
      dateReleased: typeof row.uploadedAt === 'string' ? row.uploadedAt : '',
      dateUpdated: typeof row.uploadedAt === 'string' ? row.uploadedAt : '',
      countrySubdivision: '',
      municipality: '',
      sourceUrl,
      url: sourceUrl,
      clickable: true,
      properties: {},
      getFeatures,
      getFields,
      dataManagementSystem: 'other',
      datasetType: 'GeoJSON',
      group: DatasetGroup.Organizational,
      layerColor: layerColorByName(id),
      layerType: meta?.geometryType === 'lines'
        ? 'line'
        : meta?.geometryType === 'points'
          ? 'circle'
          : meta?.geometryType === 'polygons'
            ? 'fill'
            : undefined,
    })
  }

  return datasets
}
