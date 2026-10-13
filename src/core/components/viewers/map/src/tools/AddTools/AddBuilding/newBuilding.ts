// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { withoutUndefined } from '../../../../../../../utils/utils'
import { ringToBuildingGeometry } from '../../../MapLayers/src/BuildingLayers/buildingGeometry'

import type { Building } from '../../../../../../../types/dbTypes'
import type { AddressFields } from '../../../../utils/geocoder'
import type { Ring } from '../../../MapLayers/src/SiteLayer/siteGeometry'

/** Where a new building stands: a point, plus the OSM footprint it was picked from or the ring it was drawn as. */
export interface BuildingPlacement {
  lng: number
  lat: number
  osmId?: string
  ring?: Ring
}

export function newBuildingData({ name, placement, address }: {
  name: string
  placement: BuildingPlacement
  address: AddressFields
}): Partial<Building> {
  return withoutUndefined({
    buildingName: name.trim() || address.buildingAddress?.split(',')[0].trim(),
    buildingType: ['Other'],
    buildingStoreyNum: 1,
    buildingLongitude: placement.lng,
    buildingLatitude: placement.lat,
    buildingOsmId: placement.osmId,
    buildingGeometry: placement.ring ? ringToBuildingGeometry(placement.ring) : undefined,
    ...address,
  })
}
