// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { getOsmIdFromLatLng } from './getOsmIdFromMartin'
import type { Map } from 'maplibre-gl'
import { updateBuildingOsmId } from './updateBuildingOsmId'
import type { Building } from '../../../../types/dbTypes'

export const flyToEach = async (map: Map, buildings: Building[]) => {
  // Sequentially process each building and wait for each to finish
  for (const building of buildings) {
    if (building.buildingOsmId) continue
    try {
      const osmId = await getOsmIdFromLatLng(map, building.buildingLatitude, building.buildingLongitude)
      if (osmId) {
        building.buildingOsmId = String(osmId)
      }
      console.log('OSM ID for', building.buildingName, ':', osmId)
      if (typeof osmId === 'number') {
        await updateBuildingOsmId(building.id, osmId)
      }
      else {
        throw new TypeError(`Failed to fetch OSM ID for ${building.buildingName}`)
      }
    }
    catch (error) {
      console.error(error)
      // Optionally continue on error, or break if you want to stop
      // continue;
    }
  }
}
