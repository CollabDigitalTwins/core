'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { buildWmsTileUrl } from '../../components/viewers/map/datasets/src/urlSources'
import { layerColorByName } from '../../components/viewers/map/utils/stringToColour'
import { DatasetGroup } from '../../types/dbTypes'

import { pluginDatasetId } from './pluginDatasetId'
import { usePluginContributions } from './provider'

import type { PluginContribution } from './provider'
import type { Dataset } from '../../types/datasetTypes'
import type { AllGeoJSON } from '@turf/turf'

const noFeatures = async (): Promise<AllGeoJSON> =>
  ({ type: 'FeatureCollection', features: [] }) as AllGeoJSON

type DatasetContribution = PluginContribution<'map.datasets'>

function drawnBy(registration: DatasetContribution): Pick<Dataset, 'datasetType' | 'type' | 'url' | 'timeEnabled' | 'wms' | 'getFeatures' | 'drawnByPlugin' | 'clickable'> {
  const { source, pluginId } = registration

  if (source?.type === 'wms') {
    const { baseUrl, layers, timeEnabled } = source
    return {
      datasetType: 'WMS',
      type: 'WMS',
      url: buildWmsTileUrl(baseUrl, layers),
      timeEnabled,
      wms: { baseUrl, layers },
      clickable: false,
      getFeatures: noFeatures,
    }
  }

  if (source?.type === 'geojson') {
    return {
      datasetType: 'GeoJSON',
      type: 'GeoJSON',
      clickable: true,
      getFeatures: async () => (await source.getFeatures()) as AllGeoJSON,
    }
  }

  return { datasetType: 'GeoJSON', type: 'Plugin', clickable: false, drawnByPlugin: pluginId, getFeatures: noFeatures }
}

/**
 * A `map.datasets` contribution as the Datasets menu lists it. A live one goes under Live
 * Data; any other is organizational, stamped with the viewer's own organization.
 */
export function toPluginDataset(registration: DatasetContribution, organization?: number): Dataset {
  const { pluginId, id, name, description, publisher, information, live = false } = registration
  const group = live ? DatasetGroup.National : DatasetGroup.Organizational

  return {
    id: pluginDatasetId(pluginId, id),
    name,
    description,
    publisher,
    information,
    organization: live ? undefined : organization,
    dataManagementSystem: 'other',
    countrySubdivision: '',
    municipality: '',
    group,
    layerColor: layerColorByName(name),
    portal: { id: -1, name: publisher ?? name, group, dataManagementSystem: 'Other', live },
    getFields: async () => [],
    ...drawnBy(registration),
  }
}

/** Every enabled plugin's datasets, for the lists in the Datasets menu and the Layers tab. */
export function usePluginDatasets(organization?: number): Dataset[] {
  const registrations = usePluginContributions('map.datasets')

  return React.useMemo(
    () => registrations.map(registration => toPluginDataset(registration, organization)),
    [registrations, organization],
  )
}
