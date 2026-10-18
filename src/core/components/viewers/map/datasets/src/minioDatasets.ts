// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DatasetGroup } from '../../../../../types/dbTypes'
import { layerColorByName } from '../../utils/stringToColour'

import { fetchJsonOrThrow } from './http'

import type { Dataset, FeatureRequest } from '../../../../../types/datasetTypes'
import type { AllGeoJSON } from '@turf/turf'

interface OrgDatasetDescription {
  bucket?: string
  geometryType?: 'points' | 'lines' | 'polygons'
  tiledTable?: string
  tiledAt?: string
  featuresIngested?: number
  featuresSkipped?: number
  minZoom?: number
}

interface RawFileRow {
  id: number
  type?: string | null
  tag?: string | null
  name?: string | null
  /** Presigned, expiring download URL minted per request by /api/files. */
  url?: string | null
  description?: string | null
  uploadedAt?: string | Date | null
  countrySubdivision?: string | null
  municipality?: string | null
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

function withBbox(url: string, bbox: [number, number, number, number]): string {
  return `${url}${url.includes('?') ? '&' : '?'}bbox=${bbox.map(value => value.toFixed(6)).join(',')}`
}

/** Rebuilds "Add Dataset" uploads from File rows tagged `organizational-dataset`, loading GeoJSON on first render. */
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

    const meta = parseDescription(row.description)
    // Hidden only once Martin serves the table, or the file vanishes during the publish restart.
    if (meta?.tiledTable && publishedTilesInCatalog.has(meta.tiledTable)) continue

    // A rebuilt object path would need anonymous bucket reads; only the presigned URL works.
    const sourceUrl = row.url
    if (!sourceUrl) continue

    const name = row.name?.replace(/\.geojson$/i, '') || `Dataset ${row.id}`
    const id = `org-minio-${row.id}`
    const viewport = typeof meta?.minZoom === 'number' ? { minZoom: meta.minZoom } : undefined
    let cached: AllGeoJSON | null = null

    const fetchGeoJson = (url: string, options?: FeatureRequest) =>
      fetchJsonOrThrow<AllGeoJSON>(url, 120_000, `GeoJSON fetch from ${url}`, options?.onProgress, options?.signal)

    const getFeatures: Dataset['getFeatures'] = async (options) => {
      if (viewport && options?.bbox) return fetchGeoJson(withBbox(sourceUrl, options.bbox), options)
      cached ??= await fetchGeoJson(sourceUrl, options)
      return cached
    }

    const getFields = async () => []

    datasets.push({
      id,
      // Without it the org-visibility filter drops every rebuilt dataset for non-admins.
      organization: organizationId,
      name,
      type: 'Organizational',
      publisher: 'Organizational',
      license: 'Unknown',
      contact: 'Unknown',
      description: `Uploaded ${row.uploadedAt ?? ''}`.trim(),
      dateReleased: typeof row.uploadedAt === 'string' ? row.uploadedAt : '',
      dateUpdated: typeof row.uploadedAt === 'string' ? row.uploadedAt : '',
      countrySubdivision: row.countrySubdivision ?? '',
      municipality: row.municipality ?? '',
      sourceUrl,
      url: sourceUrl,
      clickable: true,
      properties: {},
      getFeatures,
      getFields,
      viewport,
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
