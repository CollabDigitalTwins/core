// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DatasetGroup, type OpenDataPortal } from '../../../../../types/dbTypes'
import { layerColorByName } from '../../utils/stringToColour'

import { buildWmsTileUrl } from './urlSources'

import type { Dataset } from '../../../../../types/datasetTypes'
import type { AllGeoJSON } from '@turf/turf'

/**
 * Curated "live" datasets surfaced in the dataset manager's Live Data tab.
 *
 * Unlike portal-fetched datasets these are defined in code: a small, known set
 * of always-current federated feeds. The first is Environment and Climate Change
 * Canada's precipitation radar (MSC GeoMet) — a WMS raster of rain rate, the
 * server always serving the latest frame (refreshed ~every 6 minutes). Federated
 * and Canadian-governed: nothing of ours egresses, the browser fetches GeoMet
 * raster tiles directly.
 *
 * Each entry carries `portal.live === true` — the only thing the Live Data tab
 * filters on — and renders through the WMS branch of OpenDataLayer.
 */

const GEOMET_WMS_URL =
  process.env.NEXT_PUBLIC_GEOMET_WMS_URL || 'https://geo.weather.gc.ca/geomet'

const liveWeatherPortal: OpenDataPortal = {
  id: -1001, // synthetic — built-in, never persisted
  name: 'ECCC · MSC GeoMet',
  group: DatasetGroup.National,
  dataManagementSystem: 'Other',
  apiUrl: GEOMET_WMS_URL,
  country: 'Canada',
  live: true,
}

const emptyFeatures = async (): Promise<AllGeoJSON> =>
  ({ type: 'FeatureCollection', features: [] } as AllGeoJSON)

const weatherRadar: Dataset = {
  id: 'live-weather-radar',
  name: 'Live Weather Radar (Canada)',
  publisher: 'Environment and Climate Change Canada · MSC GeoMet',
  description: 'Live precipitation radar (RADAR_1KM_RRAI) — rain rate, latest frame served ~every 6 minutes.',
  dataManagementSystem: 'other',
  datasetType: 'WMS',
  type: 'WMS',
  countrySubdivision: '',
  municipality: '',
  group: DatasetGroup.National,
  clickable: false,
  // MapLibre raster tile template; {bbox-epsg-3857} stays literal (substituted per tile).
  url: buildWmsTileUrl(GEOMET_WMS_URL, 'RADAR_1KM_RRAI'),
  // Time-enabled: WMSDatasetLayer animates the WMS TIME dimension via the scrub/play control.
  timeEnabled: true,
  wms: { baseUrl: GEOMET_WMS_URL, layers: 'RADAR_1KM_RRAI' },
  information: 'https://eccc-msc.github.io/open-data/msc-geomet/readme_en/',
  portal: liveWeatherPortal,
  layerColor: layerColorByName('Live Weather Radar'),
  getFields: async () => [],
  getFeatures: emptyFeatures,
}

/** Built-in live datasets, injected into the manager so the Live Data tab has real content. */
export const builtinLiveDatasets: Dataset[] = [weatherRadar]
