import type { Dataset } from '../../../../../../../../types/datasetTypes'
import { DatasetGroup, type Building } from '../../../../../../../../types/dbTypes'

import { layerColorByName } from '../../../../../utils/stringToColour'

export function createBuildingsDataset(buildings: Building[], name: string): Dataset {
  const layerColor = layerColorByName(name)

  const getFields = async () => [
    { name: 'buildingType', type: 'string' },
    { name: 'buildingUnitsTotal', type: 'number' },
    { name: 'buildingTotalSqft', type: 'number' },
    { name: 'buildingStoreyNum', type: 'number' },
  ]

  const getFeatures = async () => ({
    type: 'FeatureCollection',
    features: buildings
      .filter(b => b.buildingLongitude != null && b.buildingLatitude != null)
      .map(building => ({
        type: 'Feature',

        geometry: {
          type: 'Point',
          coordinates: [building.buildingLongitude, building.buildingLatitude],
        },
        properties: {
          id: building.id,
          dbId: building.id,
          osm_id: building.buildingOsmId,
          isBuilding: true,
          isDbBuilding: true,
          name: building.buildingName,
          type: building.buildingType,
          unitsTotal: building.buildingUnitsTotal,
          totalSqft: building.buildingTotalSqft,
          storeyNum: building.buildingStoreyNum,
        },
      })),
  } as import('geojson').FeatureCollection)

  return {
    id: name.toLowerCase().replaceAll(/\s+/g, '_'),
    name,
    type: 'buildings',
    visible: true,
    total: buildings.length,
    getFields,
    getFeatures,
    layerColor,
    dataManagementSystem: 'other',
    datasetType: 'GeoJSON',
    countrySubdivision: undefined,
    municipality: undefined,
    publisher: 'EnviroCentre',
    keywords: ['Buildings', 'Database', 'GeoJSON'],
    group: DatasetGroup.Organizational,
  }
}
