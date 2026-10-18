// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DataManagementSystem, type OpenDataPortal } from '../../../../../types/dbTypes'
import { layerColorByName } from '../../utils/stringToColour'
import { formatDate, formatName, stripHtml } from '../utils'

import { fetchJsonOrThrow, proxiedUrl } from './http'
import { fetchAllPages } from './paginate'
import { viewportLoader } from './viewportLoader'

import type { Dataset, DatasetField, DatasetListener, LoadedFeatures, ProgressListener } from '../../../../../types/datasetTypes'
import type { FlatBounds } from '../../utils/validateBounds'

interface OdsField {
  name: string
  label?: string
  type?: string
  description?: string
}

interface OdsDataset {
  dataset_id: string
  features?: string[]
  fields?: OdsField[]
  metas?: {
    default?: {
      title?: string
      description?: string
      publisher?: string
      license?: string
      keyword?: string[]
      modified?: string
      created?: string
    }
    custom?: Record<string, string[] | undefined>
  }
}

const CATALOG_PAGE_SIZE = 100
const CATALOG_OFFSET_LIMIT = 10_000

function getJson<T>(url: string, onProgress?: ProgressListener, signal?: AbortSignal): Promise<T> {
  return fetchJsonOrThrow<T>(proxiedUrl(url), 120_000, 'OpenDataSoft request', onProgress, signal)
}

const isGeoDataset = (dataset: OdsDataset) => !dataset.features || dataset.features.includes('geo')

async function listGeoDatasets(catalog: string, onPage: (datasets: OdsDataset[]) => void): Promise<void> {
  await fetchAllPages<OdsDataset>({
    pageSize: CATALOG_PAGE_SIZE,
    hardCap: CATALOG_OFFSET_LIMIT,
    fetchPage: async (offset, limit) => {
      const page = await getJson<{ total_count?: number; results?: OdsDataset[] }>(`${catalog}/datasets?limit=${limit}&offset=${offset}`)
      const results = page.results ?? []
      return { items: results, hasMore: offset + results.length < (page.total_count ?? 0) }
    },
    onPage: page => onPage(page.filter(isGeoDataset)),
  })
}

function inBbox(geoPointField: string, [west, south, east, north]: FlatBounds): string {
  return `in_bbox(${geoPointField}, ${south}, ${west}, ${north}, ${east})`
}

function odsFields(fields: OdsField[] = []): DatasetField[] {
  return fields.map(field => ({
    name: field.name,
    alias: field.label && field.label !== field.name ? field.label : undefined,
    description: field.description || undefined,
    type: field.type === 'date' || field.type === 'datetime' ? 'datetime' : undefined,
  }))
}

function datasetSource(datasetUrl: string, dataset: OdsDataset, version: string): Pick<Dataset, 'getFeatures' | 'getFields' | 'viewport'> {
  const geoPointField = dataset.fields?.find(field => field.type === 'geo_point_2d')?.name
  const exportGeojson = (where?: string, onProgress?: ProgressListener, signal?: AbortSignal) =>
    getJson<LoadedFeatures>(`${datasetUrl}/exports/geojson${where ? `?where=${encodeURIComponent(where)}` : ''}`, onProgress, signal)
  const fetchBbox = (bbox: FlatBounds, _tolerance?: number, signal?: AbortSignal) =>
    exportGeojson(geoPointField ? inBbox(geoPointField, bbox) : undefined, undefined, signal)
  return {
    viewport: geoPointField ? { minZoom: 0 } : undefined,
    getFields: async () => odsFields(dataset.fields),
    getFeatures: viewportLoader({
      cacheKey: `opendatasoft:${dataset.dataset_id}:${version}`,
      countFeatures: async () => (await getJson<{ total_count?: number }>(`${datasetUrl}/records?limit=0`)).total_count ?? null,
      fetchAll: (_total, _tolerance, onProgress, signal) => exportGeojson(undefined, onProgress, signal),
      fetchBbox,
    }),
  }
}

function odsDataset(dataset: OdsDataset, portal: OpenDataPortal, catalog: string): Dataset {
  const metas = dataset.metas?.default ?? {}
  const custom = dataset.metas?.custom ?? {}
  const name = formatName(metas.title || dataset.dataset_id)
  return {
    id: dataset.dataset_id,
    name,
    publisher: metas.publisher || custom['data-owner']?.[0] || 'Unknown',
    dataManagementSystem: DataManagementSystem.Opendatasoft,
    license: metas.license || 'Unknown',
    contact: custom['data-team']?.[0] || 'Unknown',
    keywords: metas.keyword ?? [],
    description: stripHtml(metas.description || 'No description available'),
    dateReleased: metas.created ? formatDate(metas.created) : '',
    dateUpdated: metas.modified ? formatDate(metas.modified) : '',
    information: `${portal.apiUrl}/explore/dataset/${dataset.dataset_id}/`,
    countrySubdivision: portal.countrySubdivision ?? '',
    municipality: portal.municipality ?? '',
    type: portal.name,
    datasetType: 'GeoJSON',
    portal,
    group: portal.group,
    layerColor: layerColorByName(name),
    ...datasetSource(`${catalog}/datasets/${dataset.dataset_id}`, dataset, metas.modified ?? ''),
  }
}

export async function fetchOpenDataSoftDatasets(portal: OpenDataPortal, onDatasets?: DatasetListener): Promise<Dataset[]> {
  const baseUrl = (portal.apiUrl ?? '').replace(/\/+$/, '')
  const catalog = `${baseUrl}/catalog`
  const datasets: Dataset[] = []
  try {
    await listGeoDatasets(catalog, (page) => {
      const batch = page.map(dataset => odsDataset(dataset, portal, catalog))
      datasets.push(...batch)
      onDatasets?.(batch)
    })
    return datasets
  }
  catch (error) {
    console.error(`[OpenDataSoft] Failed to fetch datasets for portal "${portal.name}":`, error)
    return []
  }
}
