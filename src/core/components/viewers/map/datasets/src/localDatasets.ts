// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { VectorTile } from '@mapbox/vector-tile'
import Pbf from 'pbf'

import { DatasetGroup, type OpenDataPortal } from '../../../../../types/dbTypes'
import { layerColorByName } from '../../utils/stringToColour'
import { formatName } from '../utils'

import { getCache, setCache } from './cache'
import { isPublishedOrgTable, buildPublishedTileDatasets, type PublishedFileRow } from './publishedTiles'

import type { Dataset, FieldType, LayerGeometryType } from '../../../../../types/datasetTypes'
import type { AllGeoJSON } from '@turf/turf'


// Define the structure of local dataset items
interface LocalDatasetItem {
  name: string
  organization: number
  featuresUrl: string
  tileName: string
  sourceLayer: string
  layer: {
    type: string
    properties: Record<string, string>
  }
  visible: boolean
  clickable: boolean
  url: string
  description: string
  publisher: string
  countrySubdivision?: string
  municipality?: string
}

interface MartinCatalogTile {
  content_type: string
  description: string
}

interface MartinCatalog {
  tiles: Record<string, MartinCatalogTile>
}

interface MartinTileStatsAttribute {
  attribute: string
  values?: Array<string | number>
  min?: number | string
  max?: number | string
}

interface MartinTileStatsLayer {
  layer: string
  attributes?: MartinTileStatsAttribute[]
}

interface MartinTileStats {
  layers?: MartinTileStatsLayer[]
}

interface MartinTileJson {
  id?: string
  name?: string
  description?: string
  tiles?: string[]
  vector_layers?: Array<{
    id: string
    description?: string
    minzoom?: number
    maxzoom?: number
    fields?: Record<string, string>
  }>
  tilestats?: MartinTileStats
  minzoom?: number
  maxzoom?: number
}

type MartinIndexResponse =
  | MartinCatalog
  | MartinTileJson[]
  | { tiles: Record<string, MartinTileJson> }
  | { tilesets: MartinTileJson[] }

interface NormalizedMartinTile {
  tileName: string
  tileUrl: string
  description?: string
  vectorLayerId: string
  tilestats?: MartinTileStats
  minzoom?: number
}

const ORGANIZATION_FIELD = 'organization'

function normalizeMartinBaseUrl(apiUrl: string) {
  return apiUrl.replace(/\/+$/, '')
}

function resolveMartinUrls(apiUrl: string) {
  const trimmed = normalizeMartinBaseUrl(apiUrl)

  if (trimmed.endsWith('/tiles/index.json')) {
    const tileBaseUrl = trimmed.replace(/\/tiles\/index\.json$/, '')
    return {
      indexUrl: trimmed,
      tileBaseUrl,
      fallbackCatalogUrl: `${tileBaseUrl}/catalog`,
    }
  }

  if (trimmed.endsWith('/catalog')) {
    const tileBaseUrl = trimmed.replace(/\/catalog$/, '')
    return {
      indexUrl: `${tileBaseUrl}/tiles/index.json`,
      tileBaseUrl,
      fallbackCatalogUrl: trimmed,
    }
  }

  return {
    indexUrl: `${trimmed}/tiles/index.json`,
    tileBaseUrl: trimmed,
    fallbackCatalogUrl: `${trimmed}/catalog`,
  }
}

function ensureAbsoluteTileUrl(tileUrl: string, tileBaseUrl: string) {
  if (/^https?:\/\//i.test(tileUrl)) {
    return tileUrl
  }

  const cleanedBase = tileBaseUrl.replace(/\/+$/, '')
  const cleanedPath = tileUrl.replace(/^\/+/, '')
  return `${cleanedBase}/${cleanedPath}`
}

function normalizeTileInfo(tileInfo: MartinTileJson, fallbackName: string | null, tileBaseUrl: string): NormalizedMartinTile | null {
  const tileName = tileInfo.id || tileInfo.name || fallbackName
  if (!tileName) return null

  const vectorLayerId = tileInfo.vector_layers?.[0]?.id || tileName
  const tileUrlFromInfo = Array.isArray(tileInfo.tiles) && tileInfo.tiles.length > 0
    ? tileInfo.tiles[0]
    : `${tileBaseUrl}/${tileName}/{z}/{x}/{y}`

  return {
    tileName,
    tileUrl: ensureAbsoluteTileUrl(tileUrlFromInfo, tileBaseUrl),
    description: tileInfo.description || tileInfo.vector_layers?.[0]?.description,
    vectorLayerId,
    tilestats: tileInfo.tilestats,
    minzoom: tileInfo.minzoom || tileInfo.vector_layers?.[0]?.minzoom,
  }
}

function normalizeMartinCatalog(response: MartinIndexResponse, tileBaseUrl: string): NormalizedMartinTile[] {
  if (Array.isArray(response)) {
    return response
      .map(tile => normalizeTileInfo(tile, null, tileBaseUrl))
      .filter((t): t is NormalizedMartinTile => Boolean(t))
  }

  if ('tilesets' in response && Array.isArray(response.tilesets)) {
    return response.tilesets
      .map(tile => normalizeTileInfo(tile, null, tileBaseUrl))
      .filter((t): t is NormalizedMartinTile => Boolean(t))
  }

  if ('tiles' in response && response.tiles) {
    return Object.entries(response.tiles)
      .map(([tileName, tileInfo]) => normalizeTileInfo(tileInfo as MartinTileJson, tileName, tileBaseUrl))
      .filter((t): t is NormalizedMartinTile => Boolean(t))
  }

  return []
}

function parseOrganizationValue(value: unknown): number | undefined {
  if (value == null) return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value

  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function extractOrganizationFromTilestats(tilestats?: MartinTileStats): number | undefined {
  if (!tilestats?.layers) return undefined

  for (const layer of tilestats.layers) {
    const orgAttribute = layer.attributes?.find(attr =>
      attr.attribute?.toLowerCase() === ORGANIZATION_FIELD,
    )

    if (!orgAttribute) continue

    if (orgAttribute.values && orgAttribute.values.length > 0) {
      const value = parseOrganizationValue(orgAttribute.values[0])
      if (value !== undefined) return value
    }

    if (orgAttribute.min !== undefined && orgAttribute.max !== undefined) {
      const min = parseOrganizationValue(orgAttribute.min)
      const max = parseOrganizationValue(orgAttribute.max)
      if (min !== undefined && max !== undefined && min === max) {
        return min
      }
    }
  }

  return undefined
}

async function fetchOrganizationFromTile(tileUrlTemplate: string, vectorLayerId: string, preferredZoom?: number) {
  try {
    const z = typeof preferredZoom === 'number' ? Math.max(0, Math.round(preferredZoom)) : 0
    const sampleUrl = tileUrlTemplate
      .replace('{z}', String(z))
      .replace('{x}', '0')
      .replace('{y}', '0')
      .replace('{Z}', String(z))
      .replace('{X}', '0')
      .replace('{Y}', '0')

    const response = await fetch(sampleUrl)
    if (!response.ok) return undefined

    const buffer = await response.arrayBuffer()
    const vectorTile = new VectorTile(new Pbf(buffer))
    const layer = vectorTile.layers[vectorLayerId] || Object.values(vectorTile.layers)[0]

    if (!layer || layer.length === 0) return undefined

    const feature = layer.feature(0)
    const { properties } = feature.toGeoJSON(0, 0, z)

    // Determine geometry type
    let geometryType: LayerGeometryType | undefined
    if (feature.type === 1) { // Point
      geometryType = 'circle'
    } else if (feature.type === 2) { // LineString
      geometryType = 'line'
    } else if (feature.type === 3) { // Polygon
      geometryType = 'fill'
    }

    return {
      organization: parseOrganizationValue(properties?.[ORGANIZATION_FIELD]),
      geometryType
    }
  } catch (error) {
    console.warn('Failed to read organization from tile', error)
    return undefined
  }
}

async function resolveDatasetOrganization(tile: NormalizedMartinTile) {
  const fromTilestats = extractOrganizationFromTilestats(tile.tilestats)

  // Always fetch from tile to get geometry type, even if we have organization from tilestats
  const fromTile = await fetchOrganizationFromTile(tile.tileUrl, tile.vectorLayerId, tile.minzoom)

  return {
    organization: fromTilestats !== undefined ? fromTilestats : fromTile?.organization,
    geometryType: fromTile?.geometryType
  }
}

async function fetchPublishedTileLabels(): Promise<Map<string, string>> {
  try {
    const res = await fetch('/api/files')
    if (!res.ok) return new Map()
    const body = await res.json()
    const rows: Array<{ name?: string | null, description?: string | null }> =
      Array.isArray(body?.files) ? body.files : []
    const map = new Map<string, string>()
    for (const row of rows) {
      if (!row?.description || !row?.name) continue
      try {
        const desc = JSON.parse(row.description) as { tiledTable?: unknown }
        if (typeof desc?.tiledTable === 'string') {
          map.set(desc.tiledTable, row.name.replace(/\.geojson$/i, ''))
        }
      }
      catch { /* skip malformed */ }
    }
    return map
  }
  catch {
    return new Map()
  }
}

async function fetchMartinServerDatasets(
  portal: OpenDataPortal,
): Promise<Dataset[]> {
  const { countrySubdivision, municipality } = portal
  const martinServerUrl = portal.apiUrl

  if (!martinServerUrl) {
    console.warn('No Martin server URL configured for portal', portal.name)
    return []
  }

  try {
    console.log('Fetching Martin server catalog from:', martinServerUrl)

    const { indexUrl, tileBaseUrl, fallbackCatalogUrl } = resolveMartinUrls(martinServerUrl)

    const publishedLabels = await fetchPublishedTileLabels()

    let response = await fetch(indexUrl)
    if (!response.ok && fallbackCatalogUrl && fallbackCatalogUrl !== indexUrl) {
      console.warn(`Failed to fetch Martin index (${indexUrl}), falling back to catalog...`)
      response = await fetch(fallbackCatalogUrl)
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch Martin catalog: ${response.status}`)
    }

    const catalog: MartinIndexResponse = await response.json()
    const tiles = normalizeMartinCatalog(catalog, tileBaseUrl)
      // Drop our published org tables (served via the cdt_tiles function + discovered
      // from File metadata) and the cdt_tiles function source itself (no ?source= → empty).
      .filter(t => !isPublishedOrgTable(t.tileName) && t.tileName !== 'cdt_tiles')

    console.log('Martin catalog received:', tiles.length, 'tiles')

    const datasets: Dataset[] = await Promise.all(tiles.map(async (tileInfo) => {
      const publishedLabel = publishedLabels.get(tileInfo.tileName)
      const cleanName = publishedLabel ?? formatName(
        tileInfo.tileName
          .replace(/_\d{8}$/, '')
          .replace(/__\d+_\d+$/, ''),
      )

      const { organization, geometryType } = await resolveDatasetOrganization(tileInfo)

      const getFields = async () => {
        return []
      }

      const getFeatures = async (): Promise<AllGeoJSON> => {
        return {
          type: 'FeatureCollection',
          features: [],
        } as AllGeoJSON
      }

      const getFeaturesData = async () => {
        return {
          id: tileInfo.tileName,
          name: cleanName,
          type: 'MVT',
          visible: true,
          clickable: true,
          fields: [],
          source: {
            url: tileInfo.tileUrl,
            description: tileInfo.description,
            publisher: 'Martin Server',
          },
          serviceInfo: {
            tileName: tileInfo.tileName,
            sourceLayer: tileInfo.vectorLayerId,
            type: 'Martin',
            tileUrl: tileInfo.tileUrl,
          },
        }
      }

      const dataset: Dataset = {
        id: tileInfo.tileName,
        name: cleanName,
        organization,
        publisher: 'Martin Server',
        dataManagementSystem: 'other',
        license: 'Unknown',
        contact: 'Unknown',
        keywords: [],
        description: tileInfo.description || `Vector tile layer from Martin server: ${tileInfo.tileName}`,
        dateReleased: '',
        dateUpdated: '',
        information: tileInfo.tileUrl,
        url: tileInfo.tileUrl,
        countrySubdivision: countrySubdivision,
        municipality: municipality,
        type: 'MVT',
        datasetType: 'MVT' as any,
        portal,
        getFields,
        getFeatures,
        getFeaturesData,
        group: DatasetGroup.Organizational,
        layerColor: layerColorByName(cleanName),
        layerType: geometryType,
      }

      return dataset
    }))

    console.log(`Transformed ${datasets.length} Martin datasets`)

    let publishedDatasets: Dataset[] = []
    try {
      const fileRes = await fetch('/api/files')
      if (fileRes.ok) {
        const fileBody = await fileRes.json()
        const fileRows: PublishedFileRow[] = Array.isArray(fileBody?.files) ? fileBody.files : []
        publishedDatasets = buildPublishedTileDatasets(fileRows, tileBaseUrl, portal)
      }
    }
    catch (err) {
      console.warn('Failed to build published-tile datasets from /api/files', err)
    }

    return [...datasets, ...publishedDatasets]
  } catch (error) {
    console.error('Error fetching Martin server datasets:', error)
    return []
  }
}

// Fetch Local datasets from localDatasetsJson array and transform to Dataset array
export async function fetchLocalDatasets(
  portal: OpenDataPortal,
): Promise<Dataset[]> {
  const { countrySubdivision, municipality } = portal
  const apiUrl = portal.apiUrl || ''
  const trimmedApiUrl = apiUrl.replace(/\/+$/, '')

  if (!apiUrl) {
    console.warn('No apiUrl provided for portal', portal.name)
    return []
  }

  // Skip legacy portals with non-absolute URLs (e.g. ./localDatasets/index.json)
  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    return []
  }

  if (trimmedApiUrl.includes('/catalog') || trimmedApiUrl.includes('/tiles/index')) {
    return fetchMartinServerDatasets(portal)
  }

  try {
    // Fetch the localDatasets.json file
    const response = await fetch(apiUrl)
    if (!response.ok) {
      const shouldTryMartinFallback =
        !trimmedApiUrl.endsWith('.json')
        && !trimmedApiUrl.includes('/catalog')
        && !trimmedApiUrl.includes('/tiles/index')

      if (response.status === 404 && shouldTryMartinFallback) {
        console.warn(
          `Local dataset URL returned 404 (${apiUrl}); retrying as a Martin server base URL`,
        )
        return fetchMartinServerDatasets({
          ...portal,
          apiUrl: trimmedApiUrl,
        })
      }

      throw new Error(`Failed to fetch local datasets from ${apiUrl}: ${response.status}`)
    }

    const localDatasetsJson: LocalDatasetItem[] = await response.json()

    const transformedDatasets: Dataset[] = localDatasetsJson.map((datasetItem: LocalDatasetItem) => {
      // Simple getFields function that returns fields from layer properties
      const getFields = async () => {
        if (datasetItem.layer?.properties) {
          return Object.entries(datasetItem.layer.properties).map(([name, type]) => ({
            name,
            label: formatName(name),
            type: type as string,
            description: `${formatName(name)} field`,
          }))
        }
        return []
      }

      // Fetch GeoJSON data from the featuresUrl
      const getFeatures = async (): Promise<AllGeoJSON> => {
        // Create a cache key based on the dataset name and features URL
        const featuresKey = `features:local:${datasetItem.name}:${datasetItem.featuresUrl}`

        // Check cache first
        const cachedFeatures = getCache<AllGeoJSON>(featuresKey)
        if (cachedFeatures) {
          return cachedFeatures
        }

        try {
          // Use the featuresUrl from the dataset item
          let geojsonUrl: string
          if (datasetItem.featuresUrl.startsWith('http://') || datasetItem.featuresUrl.startsWith('https://')) {
            geojsonUrl = datasetItem.featuresUrl
          } else {
            const baseUrl = apiUrl.endsWith('.json')
              ? apiUrl.substring(0, apiUrl.lastIndexOf('/'))
              : apiUrl
            geojsonUrl = `${baseUrl}/${datasetItem.featuresUrl}`
          }

          const response = await fetch(geojsonUrl)

          if (!response.ok) {
            throw new Error(`Failed to fetch GeoJSON: ${response.status}`)
          }

          const geojsonData = await response.json() as AllGeoJSON

          // Cache for 1 hour
          setCache(featuresKey, geojsonData, 60 * 60 * 1000)

          return geojsonData
        } catch (error) {
          console.error(`Error loading GeoJSON for ${datasetItem.name}:`, error)
          return {
            type: 'FeatureCollection',
            features: [],
          } as AllGeoJSON
        }
      }

      const name = formatName(datasetItem.name)

      const getFeaturesData = async () => {
        try {
          return {
            // Basic layer information
            id: datasetItem.tileName || datasetItem.name.toLowerCase().replace(/\s+/g, '-'),
            name: datasetItem.name,
            type: datasetItem.layer?.type || 'GeoJSON',

            // Layer configuration
            visible: datasetItem.visible,
            clickable: datasetItem.clickable,

            // Field information (similar to ArcGIS fields structure)
            fields: datasetItem.layer?.properties
              ? Object.entries(datasetItem.layer.properties).map(([name, type]) => ({
                name,
                type: type as FieldType,
                alias: formatName(name),
                description: `${formatName(name)} field`,
              }))
              : [],

            // Source information
            source: {
              url: datasetItem.url,
              description: datasetItem.description,
              publisher: datasetItem.publisher,
              featuresUrl: datasetItem.featuresUrl,
            },

            // Additional metadata that DatasetDetails.tsx might use
            editingInfo: {
              lastEditDate: new Date().toISOString(), // Current date as placeholder
              dataLastEditDate: new Date().toISOString(),
            },

            // Layer properties summary
            properties: datasetItem.layer?.properties || {},
            fieldCount: datasetItem.layer?.properties ? Object.keys(datasetItem.layer.properties).length : 0,

            // Geometry information
            geometryType: 'Unknown', // You could infer this from the actual GeoJSON if needed

            // Service information (for compatibility)
            serviceInfo: {
              tileName: datasetItem.tileName,
              sourceLayer: datasetItem.sourceLayer,
              type: 'Local',
            },
          }
        } catch (error) {
          console.error('Error getting features data for dataset:', datasetItem.name, error)
          return null
        }
      }

      return {
        id: datasetItem.tileName || datasetItem.name.toLowerCase().replace(/\s+/g, '-'),
        name,
        organization: datasetItem.organization || 0,
        publisher: datasetItem.publisher || 'Unknown',
        dataManagementSystem: 'other',
        license: 'Unknown',
        contact: 'Unknown',
        keywords: [],
        description: datasetItem.description || 'No description available',
        dateReleased: '',
        dateUpdated: '',
        information: datasetItem.url || '',
        url: datasetItem.url || '#', // Ensure there's always a valid URL for the Link component
        countrySubdivision: datasetItem.countrySubdivision || countrySubdivision,
        municipality: datasetItem.municipality || municipality,
        type: datasetItem.layer?.type || 'GeoJSON',
        datasetType: 'GeoJSON' as const,
        portal,
        getFields,
        getFeatures,
        getFeaturesData,
        group: 'Organizational',
        layerColor: layerColorByName(name),
      }
    })

    return transformedDatasets
  } catch (error) {
    console.error('Error fetching local datasets:', error)
    return []
  }
}
