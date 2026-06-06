import React from 'react'
import Geocoder from '../../map/src/Geocoder'

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
}

export default function GeocoderInput({ onSelect }: GeocoderInputProps) {
  return (
    <Geocoder
      showDatabaseBuildings={false}
      alwaysExpanded={true}
      onSelect={(addressData: any) => {
        if (!addressData) return
        const { formatted_address, coordinates, properties } = addressData
        onSelect({
          buildingAddress: formatted_address,
          buildingLongitude: coordinates[0],
          buildingLatitude: coordinates[1],
          buildingStreetName: properties?.street,
          buildingCountrySubdivision: properties?.region_a || properties?.region,
          buildingMunicipality: properties?.locality || properties?.county,
          buildingPostalCode: properties?.postalcode,
        })
      }}
    />
  )
}
