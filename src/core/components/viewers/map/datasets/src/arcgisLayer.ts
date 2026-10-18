// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DAY_MS, getCache, makeKey, setCache } from './cache'
import { styleFromDrawingInfo, type EsriDrawingInfo } from './esriRenderer'
import { fetchJson, fetchJsonOrThrow, fetchWithTimeout, serviceBaseUrl, trackPages } from './http'
import { fetchAllPages } from './paginate'
import { pagedCollection, viewportLoader } from './viewportLoader'

import type { Dataset, DatasetField, FieldType, LoadedFeatures, ProgressListener } from '../../../../../types/datasetTypes'
import type { FlatBounds } from '../../utils/validateBounds'
import type { Feature } from 'geojson'

interface EsriField {
  name: string
  type?: string
  alias?: string
}

interface ArcgisLayerInfo {
  name?: string
  type?: string
  geometryType?: string
  maxRecordCount?: number
  advancedQueryCapabilities?: { supportsPagination?: boolean }
  fields?: EsriField[]
  drawingInfo?: EsriDrawingInfo
}

interface QueryResponse {
  features?: Feature[]
  exceededTransferLimit?: boolean
  count?: number
  objectIds?: number[] | null
  error?: { code?: number; message?: string }
}

const DEFAULT_PAGE_SIZE = 1_000
const MAX_PAGE_SIZE = 2_000
const SHAPE_PAGE_SIZE = 100
const SHAPE_GEOMETRIES = new Set(['esriGeometryPolygon', 'esriGeometryPolyline'])
const OBJECT_ID_BATCH = 500

const FIELD_TYPE_HINTS: Record<string, FieldType> = {
  esriFieldTypeDate: 'datetime',
  esriFieldTypeDateOnly: 'datetime',
  esriFieldTypeOID: 'id',
  esriFieldTypeGlobalID: 'id',
  esriFieldTypeGUID: 'id',
}

const ARCGIS_LAYER = /\/(featureserver|mapserver)\/\d+\/?(\?|$)/i
const ARCGIS_SERVICE = /\/(featureserver|mapserver)\/?(\?|$)/i

const pendingLayerInfo = new Map<string, Promise<ArcgisLayerInfo | null>>()

/** True for a FeatureServer/MapServer layer URL such as `.../FeatureServer/3`. */
export function isArcgisLayerUrl(url: string): boolean {
  return ARCGIS_LAYER.test(url)
}

/** True for a whole FeatureServer/MapServer URL, with no layer index. */
export function isArcgisServiceUrl(url: string): boolean {
  return ARCGIS_SERVICE.test(url)
}

/** A layer endpoint for a FeatureServer/MapServer URL, defaulting to layer 0 when the URL names only the service. */
export function arcgisLayerUrl(url: string): string {
  const base = serviceBaseUrl(url)
  return isArcgisLayerUrl(base) ? base : `${base}/0`
}

/** A layer `query` URL with every field of every feature, optionally limited to `bbox` (WGS84). */
export function queryUrl(layerUrl: string, params: Record<string, string>, bbox?: FlatBounds): string {
  const search = new URLSearchParams({ where: '1=1', outFields: '*', ...params })
  if (bbox) {
    const [xmin, ymin, xmax, ymax] = bbox
    search.set('geometry', JSON.stringify({ xmin, ymin, xmax, ymax, spatialReference: { wkid: 4326 } }))
    search.set('geometryType', 'esriGeometryEnvelope')
    search.set('spatialRel', 'esriSpatialRelIntersects')
    search.set('inSR', '4326')
  }
  return `${serviceBaseUrl(layerUrl)}/query?${search.toString()}`
}

async function query(url: string, onProgress?: ProgressListener, signal?: AbortSignal): Promise<QueryResponse> {
  const body = await fetchJsonOrThrow<QueryResponse>(url, 30_000, 'ArcGIS query', onProgress, signal)
  if (body.error) throw new Error(`ArcGIS query failed: ${body.error.message ?? 'unknown error'}`)
  return body
}

async function requestLayerInfo(baseUrl: string, key: string): Promise<ArcgisLayerInfo | null> {
  const info = await fetchJson<ArcgisLayerInfo & { error?: unknown }>(`${baseUrl}?f=json`)
  if (!info || info.error) return null
  setCache(key, info, DAY_MS)
  return info
}

/** The layer's metadata, cached for a day; concurrent calls for one layer share a single request. */
export function fetchLayerInfo(layerUrl: string): Promise<ArcgisLayerInfo | null> {
  const baseUrl = serviceBaseUrl(layerUrl)
  const key = makeKey(['arcgis-layer', baseUrl])
  const cached = getCache<ArcgisLayerInfo>(key)
  if (cached) return Promise.resolve(cached)
  let pending = pendingLayerInfo.get(key)
  if (pending === undefined) {
    pending = requestLayerInfo(baseUrl, key).finally(() => pendingLayerInfo.delete(key))
    pendingLayerInfo.set(key, pending)
  }
  return pending
}

async function countLayerFeatures(layerUrl: string, bbox?: FlatBounds, signal?: AbortSignal): Promise<number | null> {
  const body = await fetchJson<QueryResponse>(queryUrl(layerUrl, { returnCountOnly: 'true', f: 'json' }, bbox), undefined, signal)
  return typeof body?.count === 'number' ? body.count : null
}

interface LayerQuery {
  bbox?: FlatBounds
  total?: number | null
  tolerance?: number
  onProgress?: ProgressListener
  signal?: AbortSignal
}

const isShapeLayer = (info: ArcgisLayerInfo | null) => SHAPE_GEOMETRIES.has(info?.geometryType ?? '')

function geometryParams(info: ArcgisLayerInfo | null, tolerance?: number): Record<string, string> {
  if (tolerance === undefined || !isShapeLayer(info)) return { f: 'geojson' }
  return { f: 'geojson', outSR: '4326', maxAllowableOffset: String(tolerance) }
}

async function fetchByOffset(layerUrl: string, pageSize: number, geometry: Record<string, string>, { bbox, total: knownTotal, onProgress, signal }: LayerQuery) {
  const total = knownTotal ?? await countLayerFeatures(layerUrl, bbox, signal)
  const tracker = trackPages(onProgress, total)
  return fetchAllPages<Feature>({
    pageSize,
    total,
    signal,
    onPage: tracker.onPage,
    fetchPage: async (offset, limit, pageSignal) => {
      const page = await query(queryUrl(layerUrl, { ...geometry, resultOffset: String(offset), resultRecordCount: String(limit) }, bbox), tracker.bytes(), pageSignal)
      return { items: page.features ?? [], hasMore: page.exceededTransferLimit === true }
    },
  })
}

async function fetchByObjectIds(layerUrl: string, geometry: Record<string, string>, { bbox, onProgress, signal }: LayerQuery) {
  const objectIds = (await query(queryUrl(layerUrl, { returnIdsOnly: 'true', f: 'json' }, bbox), undefined, signal)).objectIds ?? []
  const tracker = trackPages(onProgress, objectIds.length)
  return fetchAllPages<Feature>({
    pageSize: OBJECT_ID_BATCH,
    total: objectIds.length,
    signal,
    onPage: tracker.onPage,
    fetchPage: async (offset, limit, pageSignal) => {
      const ids = objectIds.slice(offset, offset + limit).join(',')
      const page = await query(`${serviceBaseUrl(layerUrl)}/query?${new URLSearchParams({ objectIds: ids, outFields: '*', ...geometry }).toString()}`, tracker.bytes(), pageSignal)
      return { items: page.features ?? [], hasMore: false }
    },
  })
}

/** Every feature of a layer (optionally within `bbox`), paged at `maxRecordCount`; lines and polygons simplified to `tolerance` degrees. */
export async function fetchLayerFeatures(layerUrl: string, info: ArcgisLayerInfo | null, options: LayerQuery = {}): Promise<LoadedFeatures> {
  const pageSize = Math.min(info?.maxRecordCount || DEFAULT_PAGE_SIZE, isShapeLayer(info) ? SHAPE_PAGE_SIZE : MAX_PAGE_SIZE)
  const geometry = geometryParams(info, options.tolerance)
  const supportsPagination = info?.advancedQueryCapabilities?.supportsPagination !== false
  const paged = supportsPagination
    ? await fetchByOffset(layerUrl, pageSize, geometry, options)
    : await fetchByObjectIds(layerUrl, geometry, options)
  return pagedCollection(paged.items, paged)
}

export function layerFields(info: ArcgisLayerInfo | null): DatasetField[] {
  return (info?.fields ?? []).map(field => ({
    name: field.name,
    alias: field.alias && field.alias !== field.name ? field.alias : undefined,
    type: field.type ? FIELD_TYPE_HINTS[field.type] : undefined,
  }))
}

const PROBE_TIMEOUT_MS = 15_000

async function querySampleFeature(layerUrl: string): Promise<void> {
  const response = await fetchWithTimeout(queryUrl(layerUrl, { f: 'geojson', resultRecordCount: '1' }), PROBE_TIMEOUT_MS)
  if (!response.ok) throw new Error(`ArcGIS query failed: HTTP ${response.status}`)
  const body = await response.json().catch(() => ({})) as QueryResponse
  if (body.error) throw new Error(`ArcGIS query failed: HTTP ${body.error.code ?? ''} ${body.error.message ?? ''}`.trim())
}

async function probeArcgisLayer(layerUrl: string): Promise<void> {
  const [info] = await Promise.all([fetchLayerInfo(layerUrl), querySampleFeature(layerUrl)])
  if (!info) throw new Error('ArcGIS layer metadata could not be read')
}

/** The loading half of a `Dataset` for one ArcGIS layer: viewport-aware features, provider fields and the publisher's style. */
export function arcgisLayerSource(layerUrl: string, cacheKey: string): Pick<Dataset, 'getFeatures' | 'getFields' | 'getSourceStyle' | 'viewport' | 'probe'> {
  const info = () => fetchLayerInfo(layerUrl)
  return {
    viewport: { minZoom: 0 },
    probe: () => probeArcgisLayer(layerUrl),
    getFeatures: viewportLoader({
      cacheKey,
      countFeatures: () => {
        void info()
        return countLayerFeatures(layerUrl)
      },
      fetchAll: async (total, tolerance, onProgress, signal) => fetchLayerFeatures(layerUrl, await info(), { total, tolerance, onProgress, signal }),
      fetchBbox: async (bbox, tolerance, signal) => fetchLayerFeatures(layerUrl, await info(), { bbox, tolerance, signal }),
      simplifies: async () => isShapeLayer(await info()),
    }),
    getFields: async () => layerFields(await info()),
    getSourceStyle: async () => styleFromDrawingInfo((await info())?.drawingInfo),
  }
}
