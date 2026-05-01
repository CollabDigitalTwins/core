import type { Dataset, FieldType } from '../../../../../types/datasetTypes'
import type { OpenDataPortal } from '../../../../../types/dbTypes'
import { DataManagementSystem } from '../../../../../types/dbTypes'
import { formatDate, formatName, stripHtml } from '../utils'
import type { AllGeoJSON } from '@turf/turf'
import { buildValidationKey, getCache, setCache, withCache } from './cache'
import { layerColorByName } from '../../utils/stringToColour'

const DISCOVERY_PAGE_SIZE = 100
const MAX_DISCOVERED_DATASETS = 400
const FEATURE_PAGE_SIZE = 500
const MAX_FEATURES = 5_000
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

async function fetchWithRetry(target: string, isServer: boolean): Promise<Response> {
  const requestTarget = isServer
    ? target
    : `/api/socrataProxy?url=${encodeURIComponent(target)}`

  const requestInit: RequestInit = isServer
    ? { headers: buildServerHeaders() }
    : {}

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

function mapSocrataFieldType(rawType: unknown): FieldType {
  const type = String(rawType || '').toLowerCase()

  if (
    [
      'number',
      'money',
      'double',
      'float',
      'percent',
      'smallint',
      'bigint',
      'meta_data',
    ].includes(type)
  ) {
    return 'number'
  }

  if (['checkbox', 'boolean'].includes(type)) {
    return 'boolean'
  }

  if (
    [
      'calendar date',
      'date',
      'fixed_timestamp',
      'floating_timestamp',
      'timestamp',
    ].includes(type)
  ) {
    return 'datetime'
  }

  if (
    [
      'point',
      'multipoint',
      'line',
      'multiline',
      'polygon',
      'multipolygon',
      'location',
      'geometry',
      'json',
      'object',
    ].includes(type)
  ) {
    return 'object'
  }

  if (type.includes('id')) {
    return 'id'
  }

  return 'string'
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

async function withConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next++
      try {
        results[index] = {
          status: 'fulfilled',
          value: await fn(items[index]),
        }
      }
      catch (reason) {
        results[index] = {
          status: 'rejected',
          reason,
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export async function fetchSocrataDatasets(
  portal: OpenDataPortal,
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
      const isValid = await withCache<boolean>(validKey, 24 * 60 * 60 * 1000, async () => {
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
        const cached = getCache<any[]>(fieldsKey)
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

          const fields = columns.map((column: any) => {
            const rawType = column?.dataTypeName || column?.datatype || column?.type
            return {
              name: column?.fieldName || column?.name || '',
              label: column?.name || column?.fieldName || '',
              type: mapSocrataFieldType(rawType),
              socrataType: rawType,
              description: column?.description || '',
            }
          })

          setCache(fieldsKey, fields, 24 * 60 * 60 * 1000)
          return fields
        }
        catch {
          return []
        }
      }

      const getFeatures = async (): Promise<AllGeoJSON> => {
        const featuresKey = `features:socrata:${viewId}:${modifiedVersion}`
        const cached = getCache<AllGeoJSON>(featuresKey)
        if (cached) return cached

        try {
          const features: any[] = []
          let pageNumber = 1
          let offset = 0
          let mode: 'v3' | 'legacy' = 'v3'

          while (features.length < MAX_FEATURES) {
            const pageUrl = mode === 'v3'
              ? `${v3QueryBase}?pageNumber=${pageNumber}&pageSize=${FEATURE_PAGE_SIZE}`
              : `${legacyQueryBase}?$limit=${FEATURE_PAGE_SIZE}&$offset=${offset}`

            const pageRes = await fetchWithRetry(pageUrl, isServer)

            if (!pageRes.ok) {
              if (mode === 'v3' && pageNumber === 1 && [400, 401, 403, 404, 405].includes(pageRes.status)) {
                mode = 'legacy'
                continue
              }
              break
            }

            const pageJson = await pageRes.json()
            if (pageJson?.type !== 'FeatureCollection' || !Array.isArray(pageJson?.features)) {
              break
            }

            const validFeatures = pageJson.features.filter((feature: any) => !!feature?.geometry)
            if (validFeatures.length > 0) {
              features.push(...validFeatures.slice(0, MAX_FEATURES - features.length))
            }

            const fetchedCount = pageJson.features.length
            if (fetchedCount < FEATURE_PAGE_SIZE || fetchedCount === 0) {
              break
            }

            if (mode === 'v3') {
              pageNumber += 1
            }
            else {
              offset += FEATURE_PAGE_SIZE
            }
          }

          const result = {
            type: 'FeatureCollection',
            features,
          } as AllGeoJSON

          setCache(featuresKey, result, 60 * 60 * 1000)
          return result
        }
        catch (error) {
          console.error(`Socrata: Error fetching features for dataset ${viewId}:`, error)
          return {
            type: 'FeatureCollection',
            features: [],
          } as AllGeoJSON
        }
      }

      const rawName = String(view?.name || viewId)
      const name = formatName(rawName)

      const keywords = [
        ...(Array.isArray(view?.tags) ? view.tags : []),
        ...(Array.isArray(view?.classification?.domain_tags) ? view.classification.domain_tags : []),
      ]
        .map((tag: unknown) => String(tag || '').trim())
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
        group,
        layerColor: layerColorByName(name),
      }
    })

    const datasets: Dataset[] = []
    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value) {
        datasets.push(result.value)
      }
    }

    return datasets
  }
  catch (error) {
    console.error(`Error fetching Socrata datasets for ${portal.name}:`, error)
    return []
  }
}
