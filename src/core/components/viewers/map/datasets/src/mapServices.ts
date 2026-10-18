// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { layerColorByName } from '../../utils/stringToColour'

import { fetchWithProxyFallback, fetchWithTimeout, proxiedUrl, serviceBaseUrl } from './http'
import { featureCollection } from './viewportLoader'
import { buildWmsTileUrl, extractWmsLayers, parseTimeExtent, wmsCapabilitiesUrl, wmsLegendUrl } from './wmsTime'

import type { Dataset, DatasetType, MapServiceDescriptor, MapServiceKind, ServiceLegend } from '../../../../../types/datasetTypes'

export interface MapServiceLayer {
  name: string
  title: string
}

export interface RasterSource {
  tileUrl: string
  tileSize: number
  legend?: ServiceLegend
  wms?: { baseUrl: string; layers: string; proxied?: boolean }
  timeEnabled?: boolean
  frames?: string[]
}

const WEB_MERCATOR_WKIDS = new Set([3857, 102100, 102113, 900913])
const WEB_MERCATOR_CRS = /(GoogleMapsCompatible|EPSG:{1,2}(3857|900913)|OSGEO:41001)/i

const DATASET_TYPES: Record<MapServiceKind, DatasetType> = {
  wms: 'WMS',
  wmts: 'WMTS',
  arcgisMapServer: 'ArcGISRaster',
  arcgisImageServer: 'ArcGISRaster',
  xyz: 'XYZ',
}

export function detectMapService(url: string): MapServiceKind | null {
  const lower = url.toLowerCase()
  if (/\{z\}/.test(lower) && /\{x\}/.test(lower) && /\{y\}/.test(lower)) return 'xyz'
  if (lower.includes('service=wmts') || /\/wmts(\/|\?|$)|wmtscapabilities\.xml/.test(lower)) return 'wmts'
  if (lower.includes('service=wms') || /\/wms(\/|\?|$)/.test(lower)) return 'wms'
  if (/\/imageserver\/?(\?|$)/.test(lower)) return 'arcgisImageServer'
  if (/\/mapserver\/?(\?|$)/.test(lower)) return 'arcgisMapServer'
  return null
}

async function fetchXml(url: string): Promise<Document> {
  const response = await fetchWithProxyFallback(url)
  if (!response.ok) throw new Error(`Capabilities request failed: HTTP ${response.status}`)
  return new DOMParser().parseFromString(await response.text(), 'text/xml')
}

const childText = (element: Element, localName: string) =>
  Array.from(element.children).find(child => child.localName === localName)?.textContent?.trim() ?? ''

const XLINK = 'http://www.w3.org/1999/xlink'
const MAX_LEGEND_ITEMS = 50

const firstDescendant = (root: Element | Document, localName: string): Element | undefined =>
  root.getElementsByTagNameNS('*', localName)[0]

const linkOf = (element: Element | undefined): string | undefined =>
  element?.getAttributeNS(XLINK, 'href') || element?.getAttribute('xlink:href') || undefined

function inherited<T>(layer: Element, pick: (layer: Element) => T | undefined): T | undefined {
  for (let current: Element | null = layer; current?.localName === 'Layer'; current = current.parentElement) {
    const found = pick(current)
    if (found !== undefined) return found
  }
  return undefined
}

function layerLegendUrl(layer: Element): string | undefined {
  const style = Array.from(layer.children).find(child => child.localName === 'Style')
  const legend = style && firstDescendant(style, 'LegendURL')
  return legend && (linkOf(firstDescendant(legend, 'OnlineResource')) ?? linkOf(legend))
}

function layerTimeExtent(layer: Element): string | undefined {
  const dimension = Array.from(layer.children).find(child => child.localName === 'Dimension' && child.getAttribute('name')?.toLowerCase() === 'time')
  return dimension ? dimension.textContent ?? '' : undefined
}

interface WmsServiceDetails {
  getMapUrl?: string
  legendUrl?: string
  frames: string[]
}

function parseWmsService(doc: Document, layerName: string): WmsServiceDetails {
  const getMap = firstDescendant(doc, 'GetMap')
  const layer = Array.from(doc.getElementsByTagNameNS('*', 'Layer')).find(candidate => childText(candidate, 'Name') === layerName)
  return {
    getMapUrl: getMap && linkOf(firstDescendant(getMap, 'OnlineResource')),
    legendUrl: layer && inherited(layer, layerLegendUrl),
    frames: parseTimeExtent((layer && inherited(layer, layerTimeExtent)) ?? ''),
  }
}

function wmsCapabilitiesRequest(url: string): string {
  return `${serviceBaseUrl(url)}?SERVICE=WMS&REQUEST=GetCapabilities`
}

/** Named WMS layers from a GetCapabilities document. */
export function parseWmsLayers(doc: Document): MapServiceLayer[] {
  return Array.from(doc.getElementsByTagNameNS('*', 'Layer'))
    .map(layer => ({ name: childText(layer, 'Name'), title: childText(layer, 'Title') }))
    .filter(layer => layer.name)
    .map(layer => ({ name: layer.name, title: layer.title || layer.name }))
}

export async function listWmsLayers(url: string): Promise<MapServiceLayer[]> {
  return parseWmsLayers(await fetchXml(wmsCapabilitiesRequest(url)))
}

/** A WMS layer's time frames from its layer-scoped capabilities; `[]` on any failure, so the layer still draws its default time. */
export async function fetchWmsFrames({ baseUrl, layers }: { baseUrl: string; layers: string }): Promise<string[]> {
  const capabilities = await fetchXml(wmsCapabilitiesUrl(baseUrl, layers)).catch(() => null)
  return capabilities ? parseWmsService(capabilities, layers.split(',')[0]).frames : []
}

interface WmtsLayer extends MapServiceLayer {
  tileUrl: string
  legendUrl?: string
}

function webMercatorMatrixSet(doc: Document, linkedSets: string[]): { id: string; matrixPrefix: string } | null {
  const sets = Array.from(doc.getElementsByTagNameNS('*', 'TileMatrixSet')).filter(set => set.parentElement?.localName === 'Contents')
  for (const set of sets) {
    const id = childText(set, 'Identifier')
    if (!linkedSets.includes(id) || !WEB_MERCATOR_CRS.test(`${id} ${childText(set, 'SupportedCRS')}`)) continue
    const firstMatrix = Array.from(set.children).find(child => child.localName === 'TileMatrix')
    const matrixId = firstMatrix ? childText(firstMatrix, 'Identifier') : '0'
    const prefix = /^(.*?)0$/.exec(matrixId)
    if (prefix) return { id, matrixPrefix: prefix[1] }
  }
  return null
}

function wmtsTileTemplate(layer: Element, baseUrl: string, matrixSet: { id: string; matrixPrefix: string }): string | null {
  const style = Array.from(layer.children).find(child => child.localName === 'Style')
  const styleId = style ? childText(style, 'Identifier') || 'default' : 'default'
  const resource = Array.from(layer.children).find(child => child.localName === 'ResourceURL' && child.getAttribute('resourceType') === 'tile')
  const template = resource?.getAttribute('template')
  const name = childText(layer, 'Identifier')
  const filled = template
    ? template.replace(/\{Style\}/gi, styleId).replace(/\{TileMatrixSet\}/gi, matrixSet.id)
    : `${baseUrl}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${encodeURIComponent(name)}&STYLE=${encodeURIComponent(styleId)}&TILEMATRIXSET=${encodeURIComponent(matrixSet.id)}&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&FORMAT=image%2Fpng`
  const xyz = filled
    .replace(/\{TileMatrix\}/gi, `${matrixSet.matrixPrefix}{z}`)
    .replace(/\{TileRow\}/gi, '{y}')
    .replace(/\{TileCol\}/gi, '{x}')
  return /\{(?!z\}|x\}|y\})[^}]+\}/.test(xyz) ? null : xyz
}

/** WMTS layers that can be drawn in Web Mercator, each with its XYZ tile template. */
export function parseWmtsLayers(doc: Document, capabilitiesUrl: string): WmtsLayer[] {
  const layers = Array.from(doc.getElementsByTagNameNS('*', 'Layer')).filter(layer => layer.parentElement?.localName === 'Contents')
  return layers.flatMap((layer) => {
    const linkedSets = Array.from(layer.getElementsByTagNameNS('*', 'TileMatrixSet')).map(set => set.textContent?.trim() ?? '')
    const matrixSet = webMercatorMatrixSet(doc, linkedSets)
    const tileUrl = matrixSet && wmtsTileTemplate(layer, serviceBaseUrl(capabilitiesUrl), matrixSet)
    const name = childText(layer, 'Identifier')
    return tileUrl ? [{ name, title: childText(layer, 'Title') || name, tileUrl, legendUrl: layerLegendUrl(layer) }] : []
  })
}

function wmtsCapabilitiesRequest(url: string): string {
  return /wmtscapabilities\.xml/i.test(url) ? url : `${serviceBaseUrl(url)}?SERVICE=WMTS&REQUEST=GetCapabilities`
}

export async function listWmtsLayers(url: string): Promise<WmtsLayer[]> {
  const request = wmtsCapabilitiesRequest(url)
  return parseWmtsLayers(await fetchXml(request), request)
}

interface ArcgisServiceInfo {
  singleFusedMapCache?: boolean
  tileInfo?: { rows?: number; spatialReference?: { wkid?: number; latestWkid?: number } }
}

interface ArcgisLegendResponse {
  layers?: Array<{ layerId?: number; layerName?: string; legend?: Array<{ label?: string; contentType?: string; imageData?: string }> }>
}

interface GeoServerSymbolizer {
  fill?: string
  stroke?: string
  colormap?: { entries?: Array<{ color?: string; label?: string; quantity?: string }> }
}

interface GeoServerLegendResponse {
  Legend?: Array<{ rules?: Array<{ name?: string; title?: string; symbolizers?: Array<Record<string, GeoServerSymbolizer>> }> }>
}

type LegendItem = NonNullable<ServiceLegend['items']>[number]

async function fetchJsonOrEmpty<T>(url: string): Promise<Partial<T>> {
  const response = await fetchWithProxyFallback(url).catch(() => null)
  return (response?.ok ? await response.json().catch(() => ({})) : {}) as Partial<T>
}

async function arcgisLegend(base: string, layerName?: string): Promise<ServiceLegend | undefined> {
  const { layers: all = [] } = await fetchJsonOrEmpty<ArcgisLegendResponse>(`${base}/legend?f=json`)
  const named = all.filter(layer => layer.layerName === layerName || String(layer.layerId) === layerName)
  const layers = named.length > 0 ? named : all
  const items = layers.flatMap(layer => (layer.legend ?? [])
    .filter(entry => entry.imageData)
    .map(entry => ({ label: entry.label || layer.layerName || '', imageUrl: `data:${entry.contentType ?? 'image/png'};base64,${entry.imageData}` })))
  return items.length > 0 ? { items: items.slice(0, MAX_LEGEND_ITEMS) } : undefined
}

async function arcgisRaster(url: string, kind: 'arcgisMapServer' | 'arcgisImageServer'): Promise<RasterSource> {
  const base = serviceBaseUrl(url)
  const [info, legend] = await Promise.all([fetchJsonOrEmpty<ArcgisServiceInfo>(`${base}?f=json`), arcgisLegend(base)])
  const wkid = info.tileInfo?.spatialReference?.latestWkid ?? info.tileInfo?.spatialReference?.wkid
  if (info.singleFusedMapCache && wkid && WEB_MERCATOR_WKIDS.has(wkid)) {
    return { tileUrl: `${base}/tile/{z}/{y}/{x}`, tileSize: info.tileInfo?.rows ?? 256, legend }
  }
  const operation = kind === 'arcgisImageServer' ? 'exportImage' : 'export'
  const params = 'bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image'
  return { tileUrl: `${base}/${operation}?${params}`, tileSize: 256, legend }
}

const BBOX_TOKEN = '{bbox-epsg-3857}'
const WORLD_BBOX_3857 = '-20037508.34,-20037508.34,20037508.34,20037508.34'
const SAMPLE_TILE_TIMEOUT_MS = 20_000

/** A tile template routed through the open-data proxy, leaving MapLibre's bbox placeholder unencoded. */
export function proxiedTileTemplate(template: string): string {
  const [before, after = ''] = template.split(BBOX_TOKEN)
  return `${proxiedUrl(before)}${BBOX_TOKEN}${encodeURIComponent(after)}`
}

async function sampleTileIsImage(url: string): Promise<boolean> {
  const response = await fetchWithTimeout(url, SAMPLE_TILE_TIMEOUT_MS).catch(() => null)
  if (!response) return false
  if (!response.ok) throw new Error(`The map service refused map requests: HTTP ${response.status}`)
  if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error('The map service answered with an error instead of a map')
  return true
}

// MapLibre fetches tiles with CORS, so a server that omits Access-Control-Allow-Origin only draws through the proxy.
async function reachableTileTemplate(template: string): Promise<{ template: string; proxied: boolean }> {
  const sample = template.replace(BBOX_TOKEN, WORLD_BBOX_3857)
  if (await sampleTileIsImage(sample)) return { template, proxied: false }
  if (await sampleTileIsImage(proxiedUrl(sample))) return { template: proxiedTileTemplate(template), proxied: true }
  throw new Error('The map service could not be reached')
}

/** A WMS tile template for `wms`, at `time` when given, through the proxy when the service needed it. */
export function wmsTileTemplate(wms: { baseUrl: string; layers: string; proxied?: boolean }, time?: string): string {
  const template = buildWmsTileUrl(wms.baseUrl, wms.layers, time)
  return wms.proxied ? proxiedTileTemplate(template) : template
}

function geoServerLegendItems({ Legend = [] }: Partial<GeoServerLegendResponse>): LegendItem[] {
  return Legend.flatMap(layer => (layer.rules ?? []).flatMap((rule) => {
    const symbolizers = (rule.symbolizers ?? []).flatMap(symbolizer => Object.values(symbolizer))
    const entries = symbolizers.flatMap(symbolizer => symbolizer.colormap?.entries ?? []).filter(entry => entry.color)
    if (entries.length > 0) return entries.map(entry => ({ label: entry.label || entry.quantity || '', colour: entry.color as string }))
    const colour = symbolizers.map(symbolizer => symbolizer.fill ?? symbolizer.stroke).find(Boolean)
    return colour ? [{ label: rule.title || rule.name || '', colour }] : []
  }))
}

const ARCGIS_WMS = /\/services\/(.+?)\/MapServer\/WMSServer.*$/i

// A legend as data, so labels render at a readable size, before the server's own drawing of it.
async function wmsLegend(endpoint: string, layer: string, legendUrl?: string): Promise<ServiceLegend> {
  if (ARCGIS_WMS.test(endpoint)) {
    const rest = await arcgisLegend(endpoint.replace(ARCGIS_WMS, '/rest/services/$1/MapServer'), layer)
    if (rest) return rest
  }
  const params = new URLSearchParams({ SERVICE: 'WMS', VERSION: '1.1.1', REQUEST: 'GetLegendGraphic', LAYER: layer, FORMAT: 'application/json' })
  const items = geoServerLegendItems(await fetchJsonOrEmpty<GeoServerLegendResponse>(`${serviceBaseUrl(endpoint)}?${params.toString()}`))
  if (items.length > 0) return { items: items.slice(0, MAX_LEGEND_ITEMS) }
  return { imageUrl: legendUrl ?? wmsLegendUrl(endpoint, layer) }
}

async function wmsRaster(url: string, layer?: string): Promise<RasterSource> {
  const capabilities = await fetchXml(wmsCapabilitiesRequest(url)).catch(() => null)
  const layers = layer ?? (extractWmsLayers(url) || (capabilities && parseWmsLayers(capabilities)[0]?.name))
  if (!layers) throw new Error('This WMS service lists no named layers')
  const firstLayer = layers.split(',')[0]
  const service: WmsServiceDetails = capabilities ? parseWmsService(capabilities, firstLayer) : { frames: [] }
  const endpoint = service.getMapUrl ?? url
  const [{ template, proxied }, legend] = await Promise.all([
    reachableTileTemplate(buildWmsTileUrl(endpoint, layers)),
    wmsLegend(endpoint, firstLayer, service.legendUrl),
  ])
  return {
    tileUrl: template,
    tileSize: 256,
    legend,
    wms: { baseUrl: serviceBaseUrl(endpoint), layers, proxied },
    timeEnabled: service.frames.length > 1,
    frames: service.frames,
  }
}

async function wmtsRaster(url: string, layer?: string): Promise<RasterSource> {
  const layers = await listWmtsLayers(url)
  const chosen = layers.find(candidate => candidate.name === layer) ?? layers[0]
  if (!chosen) throw new Error('This WMTS service offers no Web Mercator layer')
  return { tileUrl: chosen.tileUrl, tileSize: 256, legend: chosen.legendUrl ? { imageUrl: chosen.legendUrl } : undefined }
}

/** The tile template and extras MapLibre needs to draw a map service. */
export function resolveMapService({ kind, url, layer }: MapServiceDescriptor): Promise<RasterSource> {
  switch (kind) {
    case 'xyz': return Promise.resolve({ tileUrl: url, tileSize: 256 })
    case 'wms': return wmsRaster(url, layer)
    case 'wmts': return wmtsRaster(url, layer)
    default: return arcgisRaster(url, kind)
  }
}

const resolvedServices = new Map<string, Promise<RasterSource>>()

/** `resolveMapService`, shared by every caller for the session; a failure is forgotten so the next call retries. */
export function resolveMapServiceOnce(service: MapServiceDescriptor): Promise<RasterSource> {
  const key = `${service.kind}|${service.url}|${service.layer ?? ''}`
  let resolved = resolvedServices.get(key)
  if (resolved === undefined) {
    resolved = resolveMapService(service)
    resolved.catch(() => resolvedServices.delete(key))
    resolvedServices.set(key, resolved)
  }
  return resolved
}

/** A raster `Dataset` for a map service; its tiles are resolved when the layer is first drawn. */
export function mapServiceDataset(service: MapServiceDescriptor, details: Pick<Dataset, 'name' | 'group'> & Partial<Dataset>): Dataset {
  return {
    dataManagementSystem: 'other',
    countrySubdivision: '',
    municipality: '',
    ...details,
    id: details.id ?? `map-service:${service.kind}:${service.url}:${service.layer ?? ''}`,
    type: DATASET_TYPES[service.kind],
    datasetType: DATASET_TYPES[service.kind],
    mapService: service,
    clickable: false,
    layerColor: details.layerColor ?? layerColorByName(details.name),
    getFields: async () => [],
    getFeatures: async () => featureCollection([]),
    probe: async () => { await resolveMapServiceOnce(service) },
  }
}

const RASTER_DATASET_TYPES = new Set<DatasetType>(['WMS', 'WMTS', 'ArcGISRaster', 'XYZ'])

/** True for server-rendered imagery: no features to query, colour or label. */
export function isRasterDataset(dataset: Pick<Dataset, 'datasetType' | 'mapService' | 'type'>): boolean {
  return Boolean(dataset.mapService) || RASTER_DATASET_TYPES.has(dataset.datasetType) || dataset.type === 'WMS'
}
