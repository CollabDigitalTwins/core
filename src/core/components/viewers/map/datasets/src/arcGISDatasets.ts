// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DataManagementSystem, type OpenDataPortal } from '../../../../../types/dbTypes'
import { fulfilledValues, withConcurrencyLimit } from '../../../../../utils/concurrency'
import { layerColorByName } from '../../utils/stringToColour'
import { formatName, stripHtml } from '../utils'

import { arcgisLayerSource, fetchLayerInfo, queryUrl } from './arcgisLayer'
import { buildValidationKey, DAY_MS, withCache } from './cache'
import { fetchJson } from './http'

import type { Dataset, DatasetListener } from '../../../../../types/datasetTypes'

interface ServiceEntry {
  name: string
  type: string
}

interface ServiceDirectory {
  folders?: string[]
  services?: ServiceEntry[]
}

interface ServiceInfo {
  layers?: Array<{ id: number; name?: string; type?: string; geometryType?: string }>
  documentInfo?: { ModifiedTime?: string }
}

interface ItemInfo {
  id?: string
  type?: string
  licenseInfo?: string
  description?: string
  owner?: string
  contact?: string
  tags?: string[]
  typedKeywords?: string[]
  subject?: string[]
  modified?: string | number
}

const FEATURE_SERVICE_TYPES = new Set(['FeatureServer', 'MapServer'])
const SERVICE_CONCURRENCY = 5

async function listServices(baseUrl: string, folder?: string): Promise<ServiceEntry[]> {
  const directory = await fetchJson<ServiceDirectory>(`${baseUrl}/services${folder ? `/${folder}` : ''}?f=json`)
  if (!directory) return []
  const nested = await withConcurrencyLimit(directory.folders ?? [], SERVICE_CONCURRENCY, sub => listServices(baseUrl, sub))
  return [
    ...(directory.services ?? []),
    ...fulfilledValues(nested).flat(),
  ]
}

// Only a definite answer is cached; a failed probe keeps the layer listed and is retried next time.
function hasGeometry(layerUrl: string, cacheKey: string): Promise<boolean> {
  return withCache<boolean>(cacheKey, DAY_MS, async () => {
    const sample = await fetchJson<{ type?: string; features?: Array<{ geometry?: unknown }> }>(
      queryUrl(layerUrl, { f: 'geojson', resultRecordCount: '1' }),
    )
    if (!sample) throw new Error('Geometry probe failed')
    return sample.type === 'FeatureCollection' && (sample.features ?? []).some(feature => feature?.geometry)
  }).catch(() => true)
}

async function serviceDatasets(baseUrl: string, service: ServiceEntry, portal: OpenDataPortal): Promise<Dataset[]> {
  const serviceUrl = `${baseUrl}/services/${service.name}/${service.type}`
  const [itemInfo, serviceInfo] = await Promise.all([
    fetchJson<ItemInfo>(`${serviceUrl}/info/itemInfo?f=json`),
    fetchJson<ServiceInfo>(`${serviceUrl}?f=json`),
  ])
  const item = itemInfo ?? {}
  const modified = serviceInfo?.documentInfo?.ModifiedTime || item.modified || ''
  const layers = serviceInfo?.layers?.length
    ? serviceInfo.layers.filter(layer => layer.type === 'Feature Layer')
    : [{ id: 0, name: undefined }]

  const datasets = await Promise.all(layers.map(async (layer): Promise<Dataset | null> => {
    const layerUrl = `${serviceUrl}/${layer.id}`
    if (!await hasGeometry(layerUrl, buildValidationKey('arcgis', `${service.name}_${layer.id}`, String(modified)))) return null
    const baseName = formatName(service.name)
    const name = layers.length > 1 ? `${baseName} - ${layer.name || `Layer ${layer.id}`}` : baseName
    return {
      id: item.id ? `${item.id}_${layer.id}` : `${service.name}_${layer.id}`,
      name,
      type: item.type || 'Feature Layer',
      datasetType: 'GeoJSON',
      dataManagementSystem: DataManagementSystem.Arcgis,
      url: serviceUrl,
      license: item.licenseInfo || 'Unknown',
      description: item.description ? stripHtml(item.description) : 'No description available',
      publisher: item.owner || 'Unknown',
      contact: item.contact || 'Unknown',
      keywords: item.tags || item.typedKeywords || [],
      subject: item.subject || [],
      countrySubdivision: portal.countrySubdivision ?? '',
      municipality: portal.municipality ?? '',
      group: portal.group,
      portal,
      layerColor: layerColorByName(name),
      getFeaturesData: () => fetchLayerInfo(layerUrl),
      ...arcgisLayerSource(layerUrl, `arcgis:${service.name}_${layer.id}:${modified}`),
    }
  }))
  return datasets.filter((dataset): dataset is Dataset => dataset !== null)
}

export async function fetchArcGISDatasets(portal: OpenDataPortal, onDatasets?: DatasetListener): Promise<Dataset[]> {
  const baseUrl = (portal.apiUrl || '').replace(/\/+$/, '')
  try {
    const services = (await listServices(baseUrl)).filter(service => FEATURE_SERVICE_TYPES.has(service.type))
    const results = await withConcurrencyLimit(services, SERVICE_CONCURRENCY, service => serviceDatasets(baseUrl, service, portal), onDatasets)
    return fulfilledValues(results).flat()
  }
  catch (error) {
    console.error(`[ArcGIS] Failed to fetch datasets for portal "${portal.name}":`, error)
    return []
  }
}
