// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DatasetGroup } from '../../../../../types/dbTypes'
import { layerColorByName } from '../../utils/stringToColour'

import { arcgisLayerSource, arcgisLayerUrl, fetchLayerInfo, isArcgisLayerUrl } from './arcgisLayer'
import { parseGeoJSON, type ParsedGeoJSON } from './geojsonFile'
import { fetchWithProxyFallback } from './http'
import { detectMapService } from './mapServices'

import type { Dataset, MapServiceKind } from '../../../../../types/datasetTypes'

export type UrlSourceType = 'geojson' | 'arcgis' | MapServiceKind

const FEATURE_SERVICE = /\/featureserver\/?(\?|$)/i

/** Best-guess the source type from a URL. The UI lets the user override. */
export function detectSourceType(url: string): UrlSourceType {
  if (isArcgisLayerUrl(url) || FEATURE_SERVICE.test(url)) return 'arcgis'
  return detectMapService(url) ?? 'geojson'
}

export { extractWmsLayers } from './wmsTime'

/** Derive a short, human-ish dataset name from a URL. */
export function nameFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl)
    const skip = /^(\d+|feature server|featureserver|mapserver|imageserver|services?|rest|arcgis|wms|wmts|geoserver|ows|tile|\{[xyz]\})$/i
    const segments = u.pathname.split('/').filter(s => s && !skip.test(s))
    return decodeURIComponent(segments[segments.length - 1] ?? u.hostname)
  }
  catch {
    return rawUrl
  }
}

/** Fetch a GeoJSON URL into a FeatureCollection + summary for preview. */
export async function loadGeojsonUrl(url: string): Promise<ParsedGeoJSON> {
  const res = await fetchWithProxyFallback(url, 120_000)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return parseGeoJSON(await res.text())
}

/** A live, viewport-loaded dataset for an ArcGIS feature layer URL, named after the layer. */
export async function arcgisUrlDataset(url: string, organization?: number): Promise<Dataset> {
  const layerUrl = arcgisLayerUrl(url)
  const info = await fetchLayerInfo(layerUrl)
  if (!info) throw new Error('This ArcGIS URL did not return layer information')
  const name = info.name || nameFromUrl(url)
  return {
    id: `url-arcgis:${layerUrl}`,
    organization,
    name,
    type: 'ArcGIS',
    publisher: 'Local / URL',
    description: `Imported: ${layerUrl}`,
    url: layerUrl,
    countrySubdivision: '',
    municipality: '',
    clickable: true,
    visible: true,
    dataManagementSystem: 'other',
    datasetType: 'GeoJSON',
    group: DatasetGroup.Organizational,
    layerColor: layerColorByName(name),
    ...arcgisLayerSource(layerUrl, `url-arcgis:${layerUrl}`),
  }
}
