// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import React from 'react'

import Geocoder from '../../map/src/Geocoder'
import { addressFieldsFromPlace } from '../../map/utils/geocoder'

interface GeocoderInputProps {
  onSelect: (fields: {
    buildingAddress: string
    buildingLongitude: number
    buildingLatitude: number
    buildingStreetName?: string
    buildingCountrySubdivision?: string
    buildingMunicipality?: string
    buildingPostalCode?: string
  }) => void
  geocodeEarthApiKey?: string
  geocoderUrl?: string
}

export default function GeocoderInput({ onSelect, geocodeEarthApiKey, geocoderUrl }: GeocoderInputProps) {
  return (
    <Geocoder
      showDatabaseBuildings={false}
      alwaysExpanded={true}
      geocodeEarthApiKey={geocodeEarthApiKey}
      geocoderUrl={geocoderUrl}
      onSelect={(addressData: any) => {
        if (!addressData) return
        const { formatted_address, coordinates, properties } = addressData
        onSelect({
          ...addressFieldsFromPlace(properties, formatted_address),
          buildingAddress: formatted_address,
          buildingLongitude: coordinates[0],
          buildingLatitude: coordinates[1],
        })
      }}
    />
  )
}
