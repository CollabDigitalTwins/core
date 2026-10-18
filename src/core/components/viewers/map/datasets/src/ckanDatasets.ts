// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DataManagementSystem, type OpenDataPortal } from '../../../../../types/dbTypes'
import { fulfilledValues, withConcurrencyLimit } from '../../../../../utils/concurrency'
import { formatBytes } from '../../../../../utils/utils'
import { layerColorByName } from '../../utils/stringToColour'
import { formatName, stripHtml } from '../utils'

import { arcgisLayerSource, arcgisLayerUrl, isArcgisLayerUrl, isArcgisServiceUrl } from './arcgisLayer'
import { buildValidationKey, DAY_MS, HOUR_MS, makeKey, withCache } from './cache'
import { cachedFeatures } from './featureStore'
import { GeoJsonFileIndex } from './geojsonFileIndex'
import { fetchJson, fetchJsonOrThrow, fetchWithTimeout, proxiedUrl, throwIfAborted, trackPages } from './http'
import { mapServiceDataset } from './mapServices'
import { fetchAllPages } from './paginate'
import { fileIndexLoader, pagedCollection } from './viewportLoader'

import type { Dataset, DatasetField, DatasetListener, ProgressListener } from '../../../../../types/datasetTypes'
import type { Feature, Geometry } from 'geojson'

type CkanResourceKind = 'arcgis' | 'wfs' | 'datastore' | 'geojson' | 'wms' | 'wmts'

export interface CkanResource {
  id: string
  url?: string
  name?: string
  format?: string
  state?: string
  datastore_active?: boolean | string
  last_modified?: string
  size?: number | string | null
  wms_layer?: string
}

interface CkanPackage {
  id: string
  name: string
  title?: string
  notes?: string
  type?: string
  license_title?: string
  license_id?: string
  author?: string
  maintainer?: string
  information_url?: string
  metadata_created?: string
  metadata_modified?: string
  organization?: { title?: string; name?: string }
  tags?: Array<{ name: string }>
  resources?: CkanResource[]
}

interface CkanResponse<T> {
  success?: boolean
  result?: T
}

interface DatastoreResult {
  total?: number
  fields?: Array<{ id: string; type?: string; info?: { label?: string; notes?: string } }>
  records?: Record<string, unknown>[]
}

const PACKAGE_PAGE_SIZE = 1_000
const DATASTORE_PAGE_SIZE = 32_000
const WFS_PAGE_SIZE = 10_000
const PACKAGE_CONCURRENCY = 8
const LARGE_FILE_BYTES = 50 * 1024 * 1024

const PRIORITY: CkanResourceKind[] = ['arcgis', 'wfs', 'datastore', 'geojson', 'wms', 'wmts']
const FORMAT_QUERY = 'res_format:(GeoJSON OR geojson OR "Esri REST" OR "ArcGIS GeoServices REST API" OR WFS OR WMS OR WMTS)'
const GEOMETRY_KEYS = ['geometry', 'geom', 'the_geom', 'wkb_geometry', 'shape']
const LATITUDE = /^(lat|latitude|y|y_coord)$/i
const LONGITUDE = /^(lon|lng|long|longitude|x|x_coord)$/i
const HUB_DOWNLOAD = /\/datasets\/([0-9a-f]{32})_(\d+)|\/items\/([0-9a-f]{32})\/[^?]*\?[^#]*layers=(\d+)/i

const isTrue = (value: boolean | string | undefined) => String(value).toLowerCase() === 'true'

function hasTypeName(url: string): boolean {
  return /[?&](typename|typenames|layers)=/i.test(url)
}

/** How a CKAN resource can be read, or null when this platform cannot draw it. */
export function classifyResource(resource: CkanResource): CkanResourceKind | null {
  const format = (resource.format ?? '').trim().toLowerCase()
  const url = resource.url ?? ''
  if (isTrue(resource.datastore_active)) return 'datastore'
  if (!url) return null
  if (format === 'esri rest' || format === 'arcgis geoservices rest api' || isArcgisLayerUrl(url) || isArcgisServiceUrl(url)) return 'arcgis'
  if (format === 'wfs' && hasTypeName(url)) return 'wfs'
  if (format === 'geojson' || /\.geojson(\?|$)/i.test(url)) return 'geojson'
  if (format === 'wms') return 'wms'
  if (format === 'wmts') return 'wmts'
  return null
}

/** The resource that loads best: live services first, then the datastore, a file, and rasters last. */
export function pickResource(resources: CkanResource[] = []): { resource: CkanResource; kind: CkanResourceKind } | null {
  const candidates = resources
    .filter(resource => !resource.state || resource.state === 'active')
    .flatMap((resource) => {
      const kind = classifyResource(resource)
      return kind ? [{ resource, kind }] : []
    })
  return candidates.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind))[0] ?? null
}

/** The FeatureServer layer behind an ArcGIS Hub download link, so the file never has to be downloaded whole. */
export async function hubLayerUrl(url: string): Promise<string | null> {
  const match = HUB_DOWNLOAD.exec(url)
  if (!match) return null
  const itemId = match[1] ?? match[3]
  const layer = match[2] ?? match[4]
  const item = await fetchJson<{ url?: string }>(`https://www.arcgis.com/sharing/rest/content/items/${itemId}?f=json`)
  return item?.url && isArcgisServiceUrl(`${item.url}/`) ? `${item.url.replace(/\/+$/, '')}/${layer}` : null
}

function parseGeometry(value: unknown): Geometry | null {
  if (value && typeof value === 'object' && 'type' in value) return value as Geometry
  if (typeof value !== 'string' || !value.trim().startsWith('{')) return null
  try {
    return JSON.parse(value) as Geometry
  }
  catch {
    return null
  }
}

/** A datastore row as a feature, reading a GeoJSON geometry column or a latitude/longitude pair. */
export function recordToFeature(record: Record<string, unknown>): Feature | null {
  const properties = { ...record }
  const geometryKey = Object.keys(record).find(key => GEOMETRY_KEYS.includes(key.toLowerCase()))
  if (geometryKey) {
    delete properties[geometryKey]
    const geometry = parseGeometry(record[geometryKey])
    return geometry ? { type: 'Feature', geometry, properties } : null
  }
  const latKey = Object.keys(record).find(key => LATITUDE.test(key))
  const lonKey = Object.keys(record).find(key => LONGITUDE.test(key))
  const lat = Number(latKey && record[latKey])
  const lon = Number(lonKey && record[lonKey])
  if (!latKey || !lonKey || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties }
}

class CkanApi {
  constructor(private readonly apiUrl: string) {}

  url(action: string, params: Record<string, string | number>): string {
    const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))
    return proxiedUrl(`${this.apiUrl}/api/3/action/${action}?${query.toString()}`)
  }

  async call<T>(action: string, params: Record<string, string | number>, onProgress?: ProgressListener, signal?: AbortSignal): Promise<T> {
    const body = await fetchJsonOrThrow<CkanResponse<T>>(this.url(action, params), 60_000, `CKAN ${action}`, onProgress, signal)
    if (!body.success || !body.result) throw new Error(`CKAN ${action} returned no result`)
    return body.result
  }

  async packages(onPage: (packages: CkanPackage[]) => void): Promise<void> {
    await fetchAllPages<CkanPackage>({
      pageSize: PACKAGE_PAGE_SIZE,
      fetchPage: async (start, rows) => {
        const result = await this.call<{ count: number; results: CkanPackage[] }>('package_search', { fq: FORMAT_QUERY, rows, start })
        return { items: result.results, hasMore: start + result.results.length < result.count }
      },
      onPage,
    })
  }

  datastore(resourceId: string, limit: number, offset = 0, onProgress?: ProgressListener, signal?: AbortSignal): Promise<DatastoreResult> {
    return this.call<DatastoreResult>('datastore_search', { resource_id: resourceId, limit, offset }, onProgress, signal)
  }
}

function datastoreFields(result: DatastoreResult): DatasetField[] {
  return (result.fields ?? []).filter(field => !GEOMETRY_KEYS.includes(field.id.toLowerCase())).map(field => ({
    name: field.id,
    alias: field.info?.label || undefined,
    description: field.info?.notes || undefined,
    type: /^(date|timestamp)/i.test(field.type ?? '') ? 'datetime' : undefined,
  }))
}

function datastoreSource(api: CkanApi, resource: CkanResource, version: string): Pick<Dataset, 'getFeatures' | 'getFields'> {
  const header = () => withCache(makeKey(['ckan-datastore', resource.id, version]), DAY_MS, () => api.datastore(resource.id, 0))
  const loadAll: Dataset['getFeatures'] = options => cachedFeatures(`ckan:${resource.id}:${version}`, HOUR_MS, async () => {
    const tracker = trackPages(options?.onProgress, (await header().catch(() => undefined))?.total)
    const paged = await fetchAllPages<Record<string, unknown>>({
      pageSize: DATASTORE_PAGE_SIZE,
      signal: options?.signal,
      onPage: tracker.onPage,
      fetchPage: async (offset, limit, signal) => {
        const page = await api.datastore(resource.id, limit, offset, tracker.bytes(), signal)
        const records = page.records ?? []
        return { items: records, hasMore: records.length > 0 && offset + records.length < (page.total ?? Infinity) }
      },
    })
    const features = paged.items.map(recordToFeature).filter((feature): feature is Feature => feature !== null)
    return pagedCollection(features, paged)
  }, options?.signal)
  return {
    getFields: async () => datastoreFields(await header()),
    getFeatures: loadAll,
  }
}

function wfsSource(resource: CkanResource, version: string): Pick<Dataset, 'getFeatures' | 'getFields'> {
  const url = resource.url as string
  const typeName = /[?&](?:typenames?|layers)=([^&]+)/i.exec(url)?.[1] ?? ''
  const base = url.split('?')[0]
  return {
    getFields: async () => [],
    getFeatures: options => cachedFeatures(`ckan-wfs:${resource.id}:${version}`, HOUR_MS, async () => {
      const paged = await fetchAllPages<Feature>({
        pageSize: WFS_PAGE_SIZE,
        signal: options?.signal,
        onPage: trackPages(options?.onProgress).onPage,
        fetchPage: async (startIndex, count, signal) => {
          const params = new URLSearchParams({
            service: 'WFS',
            version: '2.0.0',
            request: 'GetFeature',
            typeNames: decodeURIComponent(typeName),
            outputFormat: 'application/json',
            srsName: 'urn:ogc:def:crs:OGC:1.3:CRS84',
            count: String(count),
            startIndex: String(startIndex),
          })
          const page = await fetchJson<{ features?: Feature[]; numberMatched?: number }>(proxiedUrl(`${base}?${params.toString()}`), 60_000, signal)
          throwIfAborted(signal)
          if (!page) throw new Error('WFS GetFeature failed')
          const features = page.features ?? []
          const more = typeof page.numberMatched === 'number' ? startIndex + features.length < page.numberMatched : true
          return { items: features, hasMore: features.length > 0 && more }
        },
      })
      return pagedCollection(paged.items, paged)
    }, options?.signal),
  }
}

const REFUSED_FILE_STATUSES = new Set([401, 403, 404, 410])

// Direct only: the proxy answers HEAD with its GET handler, which would start the full download.
async function headFile(url: string): Promise<Response | null> {
  return fetchWithTimeout(url, 10_000, undefined, { method: 'HEAD' }).catch(() => null)
}

function declaredBytes(value: unknown): number | null {
  const bytes = Number(value)
  return Number.isFinite(bytes) && bytes > 0 ? bytes : null
}

async function readableFileSize(url: string, declared: number | null): Promise<number | null> {
  const head = await headFile(url)
  if (head && REFUSED_FILE_STATUSES.has(head.status)) throw new Error(`The file could not be read: HTTP ${head.status}`)
  return declared ?? declaredBytes(head?.headers.get('content-length'))
}

function geojsonFileSource(resource: CkanResource, version: string): Pick<Dataset, 'getFeatures' | 'getFields' | 'viewport' | 'release' | 'probe'> {
  const url = resource.url as string
  let delegate: Promise<Dataset['getFeatures']> | undefined
  let hubProbe: Dataset['probe']
  let index: GeoJsonFileIndex | undefined

  const chooseLoader = async (): Promise<Dataset['getFeatures']> => {
    const hubLayer = await hubLayerUrl(url).catch(() => null)
    if (hubLayer) {
      const hub = arcgisLayerSource(hubLayer, `ckan-hub:${resource.id}:${version}`)
      hubProbe = hub.probe
      return hub.getFeatures
    }
    const size = await readableFileSize(url, declaredBytes(resource.size))
    if (size !== null && size > LARGE_FILE_BYTES) {
      throw new Error(`This file is ${formatBytes(size)}. Publish it as vector tiles to view it.`)
    }
    const fileIndex = new GeoJsonFileIndex([url, proxiedUrl(url)], size ?? undefined)
    index = fileIndex
    return fileIndexLoader(onProgress => fileIndex.load(onProgress), bbox => fileIndex.slice(bbox))
  }

  const loader = () => {
    if (delegate === undefined) {
      delegate = chooseLoader()
      delegate.catch(() => { delegate = undefined })
    }
    return delegate
  }

  return {
    viewport: { minZoom: 0 },
    getFields: async () => [],
    getFeatures: async options => (await loader())(options),
    probe: async () => {
      await loader()
      await hubProbe?.()
    },
    release: () => {
      index?.dispose()
      index = undefined
      delegate = undefined
    },
  }
}

// Only a definite answer is cached; a failed probe keeps the dataset listed and is retried next time.
async function hasGeometry(api: CkanApi, resource: CkanResource, version: string): Promise<boolean> {
  return withCache<boolean>(buildValidationKey('ckan', resource.id, version), DAY_MS, async () => {
    const sample = await api.datastore(resource.id, 1)
    return (sample.records ?? []).some(record => recordToFeature(record) !== null)
  }).catch(() => true)
}

function featureSource(api: CkanApi, resource: CkanResource, kind: Exclude<CkanResourceKind, 'wms' | 'wmts'>, version: string) {
  switch (kind) {
    case 'arcgis': return arcgisLayerSource(arcgisLayerUrl(resource.url as string), `ckan-arcgis:${resource.id}:${version}`)
    case 'wfs': return wfsSource(resource, version)
    case 'datastore': return datastoreSource(api, resource, version)
    case 'geojson': return geojsonFileSource(resource, version)
  }
}

function packageDetails(pkg: CkanPackage, portal: OpenDataPortal) {
  const name = formatName(pkg.title || pkg.name)
  return {
    id: pkg.id,
    name,
    publisher: pkg.organization?.title || pkg.organization?.name || 'Unknown',
    license: pkg.license_title || pkg.license_id || 'Unknown',
    contact: pkg.author || pkg.maintainer || 'Unknown',
    keywords: pkg.tags?.map(tag => tag.name) ?? [],
    description: pkg.notes ? stripHtml(pkg.notes) : 'No description available',
    dateReleased: pkg.metadata_created || '',
    dateUpdated: pkg.metadata_modified || '',
    information: pkg.information_url || '',
    countrySubdivision: portal.countrySubdivision ?? '',
    municipality: portal.municipality ?? '',
    group: portal.group,
    portal,
    layerColor: layerColorByName(name),
  }
}

async function packageDataset(api: CkanApi, pkg: CkanPackage, portal: OpenDataPortal): Promise<Dataset | null> {
  const picked = pickResource(pkg.resources)
  if (!picked) return null
  const { resource, kind } = picked
  const version = resource.last_modified || pkg.metadata_modified || ''
  const details = packageDetails(pkg, portal)
  if (kind === 'wms' || kind === 'wmts') {
    const layer = resource.wms_layer || /[?&]layers=([^&]+)/i.exec(resource.url ?? '')?.[1]
    return mapServiceDataset({ kind, url: resource.url as string, layer: layer ? decodeURIComponent(layer) : undefined }, { ...details, dataManagementSystem: DataManagementSystem.Ckan })
  }
  if (kind === 'datastore' && !await hasGeometry(api, resource, version)) return null

  return {
    ...details,
    url: resource.url,
    dataManagementSystem: DataManagementSystem.Ckan,
    type: pkg.type || 'GeoJSON',
    datasetType: 'GeoJSON',
    ...featureSource(api, resource, kind, version),
  }
}

async function pageDatasets(api: CkanApi, packages: CkanPackage[], portal: OpenDataPortal, onDatasets?: DatasetListener): Promise<Dataset[]> {
  const results = await withConcurrencyLimit(packages, PACKAGE_CONCURRENCY, pkg => packageDataset(api, pkg, portal), (dataset) => {
    if (dataset) onDatasets?.([dataset])
  })
  return fulfilledValues(results).filter((dataset): dataset is Dataset => dataset !== null)
}

export async function fetchCkanDatasets(portal: OpenDataPortal, onDatasets?: DatasetListener): Promise<Dataset[]> {
  if (!portal.apiUrl) return []
  const api = new CkanApi(portal.apiUrl.replace(/\/+$/, ''))
  try {
    const pages: Promise<Dataset[]>[] = []
    let previous: Promise<unknown> = Promise.resolve()
    await api.packages((packages) => {
      const page = previous.then(() => pageDatasets(api, packages, portal, onDatasets))
      pages.push(page)
      previous = page
    })
    return (await Promise.all(pages)).flat()
  }
  catch (error) {
    console.error(`[CKAN] Failed to fetch datasets for portal "${portal.name}":`, error)
    return []
  }
}
