// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { UrlSourceType } from './urlSources'

export const ORG_DATASET_TAG = 'organizational-dataset'
export const URL_DATASET_PUBLISHER = 'Local / URL'
const ORG_DATASET_ID_PREFIX = 'org-minio-'

export type DatasetGeometry = 'points' | 'lines' | 'polygons'

/** What a saved URL dataset needs to be rebuilt; object-storage uploads carry `bucket` instead. */
export interface UrlDatasetSource {
  sourceUrl: string
  serviceType: UrlSourceType
  layer?: string
}

export interface OrgDatasetRow {
  name: string
  assetId: string
  mimeType: string
  extension: string
  sizeBytes?: number
  description: Record<string, unknown>
}

export const orgFileDatasetId = (fileId: number) => `${ORG_DATASET_ID_PREFIX}${fileId}`

export function fileIdFromOrgDatasetId(datasetId: unknown): number | null {
  if (typeof datasetId !== 'string' || !datasetId.startsWith(ORG_DATASET_ID_PREFIX)) return null
  const fileId = Number(datasetId.slice(ORG_DATASET_ID_PREFIX.length))
  return Number.isFinite(fileId) ? fileId : null
}

export function urlDatasetRow(name: string, source: UrlDatasetSource, geometryType?: DatasetGeometry): OrgDatasetRow {
  return {
    name,
    assetId: `url-${crypto.randomUUID()}`,
    mimeType: 'text/uri-list',
    extension: 'url',
    description: { ...source, geometryType },
  }
}

/** Creates the File row for the signed-in organization; the server scopes it and stamps the uploader. */
export async function createOrgDatasetFile(row: OrgDatasetRow): Promise<number> {
  const res = await fetch('/api/files/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...row,
      type: 'map-file',
      tag: ORG_DATASET_TAG,
      isVisible: true,
      description: JSON.stringify(row.description),
    }),
  })
  if (!res.ok) throw new Error(`File row create returned ${res.status}`)
  const { newFile } = await res.json()
  if (typeof newFile?.id !== 'number') throw new Error('File row create returned no id')
  return newFile.id
}

export const createUrlDatasetFile = (name: string, source: UrlDatasetSource, geometryType?: DatasetGeometry) =>
  createOrgDatasetFile(urlDatasetRow(name, source, geometryType))
