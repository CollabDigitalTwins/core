// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DataManagementSystem } from '../../../../../types/dbTypes'
import { fulfilledValues, withConcurrencyLimit } from '../../../../../utils/concurrency'
import { toDisplayString } from '../../../../../utils/utils'
import { layerColorByName } from '../../utils/stringToColour'
import { formatDate, formatName, stripHtml } from '../utils'

import { buildValidationKey, DAY_MS, getCache, setCache, withCache } from './cache'
import { proxiedUrl, readJsonWithProgress, throwIfAborted, trackPages } from './http'
import { fetchAllPages } from './paginate'
import { pagedCollection, viewportLoader } from './viewportLoader'

import type { DatasetField, Dataset, DatasetListener, LoadedFeatures, ProgressListener } from '../../../../../types/datasetTypes'
import type { OpenDataPortal } from '../../../../../types/dbTypes'
import type { FlatBounds } from '../../utils/validateBounds'
import type { Feature } from 'geojson'

const DISCOVERY_PAGE_SIZE = 100
const MAX_DISCOVERED_DATASETS = 400
const FEATURE_PAGE_SIZE = 50_000
const DATE_TYPES = new Set(['calendar date', 'date', 'fixed_timestamp', 'floating_timestamp', 'timestamp'])
const RETRY_BASE_MS = 500
const MAX_RETRIES = 2

const socrataGeoTypes = new Set([
  'point',
  'multipoint',
  'line',
  'multiline',
  'polygon',
  'multipolygon',
  'location',
  'geometry',
])

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null

  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.min(Math.floor(numeric * 1000), 15_000)
  }

  const asDate = Date.parse(value)
  if (Number.isNaN(asDate)) return null

  const deltaMs = asDate - Date.now()
  if (deltaMs <= 0) return 0
  return Math.min(deltaMs, 15_000)
}

function toIsoDate(value: unknown): string {
  if (value == null) return ''

  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 9_999_999_999 ? value : value * 1000
    return formatDate(new Date(ms).toISOString())
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''

    const asNumber = Number(trimmed)
    if (Number.isFinite(asNumber)) {
      const ms = asNumber > 9_999_999_999 ? asNumber : asNumber * 1000
      return formatDate(new Date(ms).toISOString())
    }

    return formatDate(trimmed)
  }

  return ''
}

function normalizeSocrataOrigin(apiUrl?: string | null): string | null {
  if (!apiUrl) return null

  const trimmed = apiUrl.trim()
  if (!trimmed) return null

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const parsed = new URL(withScheme)
    return parsed.origin
  }
  catch {
    return null
  }
}

function extractViewIdFromUrl(apiUrl?: string | null): string | null {
  if (!apiUrl) return null

  const viewMatch = apiUrl.match(/\/api\/v3\/views\/([a-z0-9-]{9})\//i)
  if (viewMatch?.[1]) return viewMatch[1]

  const discoverMatch = apiUrl.match(/\/d\/([a-z0-9-]{9})/i)
  if (discoverMatch?.[1]) return discoverMatch[1]

  return null
}

function buildServerHeaders() {
  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (compatible; CDT-OP/1.0)',
  }

  const appToken = process.env.SOCRATA_APP_TOKEN || process.env.NEXT_PUBLIC_SOCRATA_APP_TOKEN
  if (appToken) {
    headers['X-App-Token'] = appToken
  }

  return headers
}

async function fetchWithRetry(target: string, isServer: boolean, signal?: AbortSignal): Promise<Response> {
  const requestTarget = isServer ? target : proxiedUrl(target)

  const requestInit: RequestInit = isServer
    ? { headers: buildServerHeaders(), signal }
    : { signal }

  let attempt = 0
  let lastError: unknown = null

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await fetch(requestTarget, requestInit)

      // Retry on throttling and transient server errors.
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'))
        const backoffMs = retryAfterMs ?? Math.min(RETRY_BASE_MS * (2 ** attempt), 5_000)
        await delay(backoffMs)
        attempt += 1
        continue
      }

      return response
    }
    catch (error) {
      throwIfAborted(signal)
      lastError = error
      if (attempt >= MAX_RETRIES) break

      await delay(Math.min(RETRY_BASE_MS * (2 ** attempt), 5_000))
      attempt += 1
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Socrata request failed')
}

function geoColumnName(columns: any[]): string | undefined {
  const column = columns.find((candidate: any) => socrataGeoTypes.has(String(candidate?.dataTypeName || candidate?.datatype || candidate?.type || '').toLowerCase()))
  return column?.fieldName || undefined
}

function withinBox(column: string, [west, south, east, north]: FlatBounds): string {
  return `within_box(${column}, ${north}, ${west}, ${south}, ${east})`
}

function hasGeoColumns(view: any): boolean {
  const columns = Array.isArray(view?.columns) ? view.columns : []

  if (columns.length === 0) {
    return false
  }

  return columns.some((column: any) => {
    const dataTypeName = String(column?.dataTypeName || column?.datatype || column?.type || '').toLowerCase()
    return socrataGeoTypes.has(dataTypeName)
  })
}

function hasGeospatialMetadataFlag(view: any): boolean | null {
  const flag = view?.metadata?.custom_fields?.['Geospatial Information']?.['Dataset contains geospatial information']
  if (typeof flag !== 'string') {
    return null
  }

  if (/^\s*(yes|true)\s*$/i.test(flag)) {
    return true
  }

  if (/^\s*(no|false)\s*$/i.test(flag)) {
    return false
  }

  return null
}

function isLikelyGeospatialView(view: any): boolean {
  const geoColumns = hasGeoColumns(view)
  if (geoColumns) {
    return true
  }

  const metadataFlag = hasGeospatialMetadataFlag(view)
  if (metadataFlag === true) {
    return true
  }

  if (metadataFlag === false) {
    return false
  }

  const columns = Array.isArray(view?.columns) ? view.columns : []
  return columns.length === 0
}

function normalizeDiscoveryViews(raw: any): { total: number | null, views: any[] } {
  if (Array.isArray(raw?.results)) {
    const views = raw.results
      .map((item: any) => item?.view || item)
      .filter(Boolean)

    return {
      total: typeof raw.count === 'number' ? raw.count : null,
      views,
    }
  }

  if (Array.isArray(raw)) {
    return {
      total: null,
      views: raw,
    }
  }

  return {
    total: null,
    views: [],
  }
}

async function discoverSocrataViews(origin: string, isServer: boolean): Promise<any[]> {
  const collected: any[] = []
  const seenIds = new Set<string>()

  let offset = 0
  let totalCount: number | null = null

  while (collected.length < MAX_DISCOVERED_DATASETS) {
    const searchUrl = `${origin}/api/search/views.json?limit=${DISCOVERY_PAGE_SIZE}&offset=${offset}`

    let payload: any = null

    try {
      const searchResponse = await fetchWithRetry(searchUrl, isServer)
      if (searchResponse.ok) {
        payload = await searchResponse.json()
      }
    }
    catch (error) {
      console.warn('[Socrata] Search discovery request failed, trying fallback endpoint:', error)
    }

    if (!payload) {
      const fallbackUrl = `${origin}/api/views.json?limit=${DISCOVERY_PAGE_SIZE}&offset=${offset}`
      try {
        const fallbackResponse = await fetchWithRetry(fallbackUrl, isServer)
        if (!fallbackResponse.ok) {
          console.warn(`[Socrata] Fallback discovery request failed with status ${fallbackResponse.status}`)
          break
        }
        payload = await fallbackResponse.json()
      }
      catch (fallbackError) {
        console.error('[Socrata] Fallback discovery request failed:', fallbackError)
        break
      }
    }

    const normalized = normalizeDiscoveryViews(payload)
    if (typeof normalized.total === 'number') {
      totalCount = normalized.total
    }

    if (normalized.views.length === 0) {
      break
    }

    for (const view of normalized.views) {
      const id = String(view?.id || '')
      if (!id || seenIds.has(id)) continue

      const assetType = String(view?.assetType || view?.type || '').toLowerCase()
      if (assetType && !['dataset', 'map'].includes(assetType)) continue

      if (!isLikelyGeospatialView(view)) continue

      seenIds.add(id)
      collected.push(view)

      if (collected.length >= MAX_DISCOVERED_DATASETS) {
        break
      }
    }

    offset += DISCOVERY_PAGE_SIZE

    if (totalCount !== null && offset >= totalCount) {
      break
    }

    if (normalized.views.length < DISCOVERY_PAGE_SIZE) {
      break
    }
  }

  return collected
}

export async function fetchSocrataDatasets(
  portal: OpenDataPortal,
  onDatasets?: DatasetListener,
): Promise<Dataset[]> {
  const { apiUrl, countrySubdivision, municipality, group } = portal
  const isServer = typeof window === 'undefined'

  const origin = normalizeSocrataOrigin(apiUrl)
  if (!origin) {
    return []
  }

  try {
    const hintedViewId = extractViewIdFromUrl(apiUrl)
    const discoveredViews = await discoverSocrataViews(origin, isServer)

    if (discoveredViews.length === 0 && hintedViewId) {
      try {
        const metadataRes = await fetchWithRetry(`${origin}/api/views/${hintedViewId}.json`, isServer)
        if (metadataRes.ok) {
          const metadata = await metadataRes.json()
          discoveredViews.push(metadata)
        }
      }
      catch {
        discoveredViews.push({ id: hintedViewId, name: hintedViewId })
      }
    }

    if (hintedViewId) {
      discoveredViews.sort((a, b) => {
        if (a?.id === hintedViewId) return -1
        if (b?.id === hintedViewId) return 1
        return 0
      })
    }

    const settled = await withConcurrencyLimit(discoveredViews, 6, async (view: any): Promise<Dataset | null> => {
      const viewId = String(view?.id || '')
      if (!viewId) return null

      const modifiedVersion =
        view?.rowsUpdatedAt
        || view?.data_updated_at
        || view?.updatedAt
        || view?.viewLastModified
        || view?.metadata_updated_at
        || ''

      const v3QueryBase = `${origin}/api/v3/views/${viewId}/query.geojson`
      const legacyQueryBase = `${origin}/resource/${viewId}.geojson`

      const validKey = buildValidationKey('socrata-v2', viewId, modifiedVersion)
      const isValid = await withCache<boolean>(validKey, DAY_MS, async () => {
        try {
          const sampleUrl = `${v3QueryBase}?pageNumber=1&pageSize=1`
          const sampleRes = await fetchWithRetry(sampleUrl, isServer)

          if (sampleRes.ok) {
            const sample = await sampleRes.json()
            if (sample?.type !== 'FeatureCollection' || !Array.isArray(sample?.features)) {
              return true
            }

            if (sample.features.length === 0) {
              return true
            }

            return sample.features.some((feature: any) => !!feature?.geometry)
          }

          if ([400, 401, 403, 404, 405].includes(sampleRes.status)) {
            const legacySampleRes = await fetchWithRetry(`${legacyQueryBase}?$limit=1`, isServer)

            if ([401, 403, 404].includes(legacySampleRes.status)) {
              return false
            }

            if (!legacySampleRes.ok) {
              return true
            }

            const legacySample = await legacySampleRes.json()
            if (legacySample?.type !== 'FeatureCollection' || !Array.isArray(legacySample?.features)) {
              return true
            }

            if (legacySample.features.length === 0) {
              return true
            }

            return legacySample.features.some((feature: any) => !!feature?.geometry)
          }

          return true
        }
        catch {
          return true
        }
      })

      if (!isValid) {
        return null
      }

      const getFeaturesData = async () => {
        try {
          const metadataRes = await fetchWithRetry(`${origin}/api/views/${viewId}.json`, isServer)
          if (!metadataRes.ok) return undefined
          return await metadataRes.json()
        }
        catch {
          return undefined
        }
      }

      const getFields = async () => {
        const fieldsKey = `fields:socrata:${viewId}:${modifiedVersion}`
        const cached = getCache<DatasetField[]>(fieldsKey)
        if (cached) return cached

        try {
          let columns = Array.isArray(view?.columns) ? view.columns : []

          if (columns.length === 0) {
            const metadataRes = await fetchWithRetry(`${origin}/api/views/${viewId}.json`, isServer)
            if (metadataRes.ok) {
              const metadata = await metadataRes.json()
              if (Array.isArray(metadata?.columns)) {
                columns = metadata.columns
              }
            }
          }

          const fields: DatasetField[] = columns.map((column: any) => ({
            name: column?.fieldName || column?.name || '',
            alias: column?.name && column.name !== column.fieldName ? column.name : undefined,
            description: column?.description || undefined,
            type: DATE_TYPES.has(String(column?.dataTypeName || '').toLowerCase()) ? 'datetime' : undefined,
          }))

          setCache(fieldsKey, fields, DAY_MS)
          return fields
        }
        catch {
          return []
        }
      }

      const geoColumn = geoColumnName(Array.isArray(view?.columns) ? view.columns : [])
      const resourceJson = async <T>(path: string, onProgress?: ProgressListener, signal?: AbortSignal): Promise<T> => {
        const response = await fetchWithRetry(`${origin}/resource/${viewId}${path}`, isServer, signal)
        if (!response.ok) throw new Error(`Socrata request failed: HTTP ${response.status}`)
        return readJsonWithProgress<T>(response, onProgress)
      }
      const fetchGeojson = async (where?: string, knownTotal?: number | null, onProgress?: ProgressListener, signal?: AbortSignal): Promise<LoadedFeatures> => {
        const filter = where ? `&$where=${encodeURIComponent(where)}` : ''
        const total = where ? null : knownTotal ?? await countRows()
        const tracker = trackPages(onProgress, total)
        const paged = await fetchAllPages<Feature>({
          pageSize: FEATURE_PAGE_SIZE,
          total,
          signal,
          onPage: tracker.onPage,
          fetchPage: async (offset, limit, pageSignal) => {
            const page = await resourceJson<{ features?: Feature[] }>(`.geojson?$order=:id&$limit=${limit}&$offset=${offset}${filter}`, tracker.bytes(), pageSignal)
            const features = page.features ?? []
            return { items: features, hasMore: features.length === limit }
          },
        })
        return pagedCollection(paged.items.filter(feature => feature.geometry), paged)
      }
      const countRows = async () => {
        const [row] = await resourceJson<Array<{ count?: string }>>('.json?$select=count(*) as count')
        const count = Number(row?.count)
        return Number.isFinite(count) ? count : null
      }
      const fetchBbox = (bbox: FlatBounds, _tolerance?: number, signal?: AbortSignal) =>
        fetchGeojson(geoColumn ? withinBox(geoColumn, bbox) : undefined, undefined, undefined, signal)
      const getFeatures = viewportLoader({
        cacheKey: `socrata:${viewId}:${modifiedVersion}`,
        countFeatures: countRows,
        fetchAll: (total, _tolerance, onProgress, signal) => fetchGeojson(undefined, total, onProgress, signal),
        fetchBbox,
      })

      const rawName = String(view?.name || viewId)
      const name = formatName(rawName)

      const keywords = [
        ...(Array.isArray(view?.tags) ? view.tags : []),
        ...(Array.isArray(view?.classification?.domain_tags) ? view.classification.domain_tags : []),
      ]
        .map((tag: unknown) => toDisplayString(tag).trim())
        .filter(Boolean)

      const publisher =
        view?.attribution
        || view?.owner?.displayName
        || view?.creator?.display_name
        || 'Unknown'

      const license =
        view?.license?.name
        || view?.metadata?.license
        || 'Unknown'

      const dateReleased = toIsoDate(view?.createdAt || view?.created_at || view?.publicationDate)
      const dateUpdated = toIsoDate(
        view?.rowsUpdatedAt
        || view?.data_updated_at
        || view?.updatedAt
        || view?.viewLastModified,
      )

      const information =
        view?.permalink
        || view?.link
        || `${origin}/d/${viewId}`

      return {
        id: viewId,
        name,
        url: information,
        sourceUrl: `${legacyQueryBase}`,
        publisher,
        dataManagementSystem: DataManagementSystem.Socrata,
        license,
        contact: view?.contact_email || view?.owner?.displayName || 'Unknown',
        keywords,
        description: stripHtml(view?.description || 'No description available'),
        dateReleased,
        dateUpdated,
        information,
        countrySubdivision,
        municipality,
        type: view?.viewType || 'GeoJSON',
        datasetType: 'GeoJSON',
        portal,
        getFields,
        getFeatures,
        getFeaturesData,
        viewport: geoColumn ? { minZoom: 0 } : undefined,
        group,
        layerColor: layerColorByName(name),
      }
    }, (dataset) => {
      if (dataset) onDatasets?.([dataset])
    })

    return fulfilledValues(settled).filter((dataset): dataset is Dataset => dataset !== null)
  }
  catch (error) {
    console.error(`Error fetching Socrata datasets for ${portal.name}:`, error)
    return []
  }
}
