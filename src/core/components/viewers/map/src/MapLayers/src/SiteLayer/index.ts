// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Dataset } from '../../../../../../../types/datasetTypes'
import { DatasetGroup, type Site } from '../../../../../../../types/dbTypes'

import { layerColorByName } from '../../../../utils/stringToColour'

export function createSitesDataset(sites: Site[], name: string): Dataset {
  const layerColor = layerColorByName(name)

  const getFields = async () => [
    { name: 'siteType', type: 'string' },
    { name: 'siteUnitsTotal', type: 'number' },
    { name: 'siteTotalSqft', type: 'number' },
    { name: 'siteStoreyNum', type: 'number' },
  ]

  const getFeatures = async () => ({
    type: 'FeatureCollection',
    features: sites
      .filter(s => s.siteLongitude != null && s.siteLatitude != null)
      .map(site => ({
        type: 'Feature',

        geometry: {
          type: 'Point',
          coordinates: [site.siteLongitude, site.siteLatitude],
        },
        properties: {
          id: site.id,
          dbId: site.id,
          isBuilding: true,
          isDbBuilding: true,
          name: site.siteName,
        //   type: site.siteType,
        //   unitsTotal: site.siteUnitsTotal,
        //   totalSqft: site.siteTotalSqft,
        //   storeyNum: site.siteStoreyNum,
        },
      })),
  } as import('geojson').FeatureCollection)

  return {
    id: name.toLowerCase().replaceAll(/\s+/g, '_'),
    name,
    type: 'sites',
    visible: true,
    total: sites.length,
    getFields,
    getFeatures,
    layerColor,
    dataManagementSystem: 'other',
    datasetType: 'GeoJSON',
    countrySubdivision: undefined,
    municipality: undefined,
    publisher: 'EnviroCentre',
    keywords: ['sites', 'Database', 'GeoJSON'],
    group: DatasetGroup.Organizational,
  }
}
