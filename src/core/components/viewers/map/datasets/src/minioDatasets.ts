// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DatasetGroup } from '../../../../../types/dbTypes'
import { layerColorByName } from '../../utils/stringToColour'

import type { Dataset } from '../../../../../types/datasetTypes'
import type { AllGeoJSON } from '@turf/turf'

/**
 * Hydrates uploaded GeoJSON datasets persisted via "Add Dataset". Looks up File
 * rows tagged `organizational-dataset` and builds Dataset entries whose
 * `getFeatures` lazy-loads the GeoJSON on first render.
 */

interface OrgDatasetDescription {
  bucket?: string
  geometryType?: 'points' | 'lines' | 'polygons'
  layerStyles?: Record<string, Record<string, string | number>>
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
    // Suppress the MinIO entry only once Martin actually serves the published
    // table — otherwise the file appears to vanish during the publish→restart
    // gap. Un-publish drops the table immediately, so the MinIO row reappears
    // on next reload with no extra plumbing.
    if (meta?.tiledTable && publishedTilesInCatalog.has(meta.tiledTable)) continue

    // Only ever the presigned URL the server minted for this session. Rebuilding
    // the object path here would require the bucket to allow anonymous reads.
    const sourceUrl = row.url
    if (!sourceUrl) continue

    const name = row.name?.replace(/\.geojson$/i, '') || `Dataset ${row.id}`
    const id = `org-minio-${row.id}`
    const viewport = typeof meta?.minZoom === 'number' ? { minZoom: meta.minZoom } : undefined
    let cached: AllGeoJSON | null = null

    const fetchGeoJson = async (url: string): Promise<AllGeoJSON> => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch GeoJSON from ${url}: ${response.status}`)
      }
      return await response.json() as AllGeoJSON
    }

    const getFeatures: Dataset['getFeatures'] = async (options) => {
      if (viewport && options?.bbox) return fetchGeoJson(withBbox(sourceUrl, options.bbox))
      cached ??= await fetchGeoJson(sourceUrl)
      return cached
    }

    const getFields = async () => []

    datasets.push({
      id,
      // Stamped so the map's org-visibility filter can tell whose dataset this
      // is. Without it every rebuilt dataset is dropped for non-admin viewers.
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
