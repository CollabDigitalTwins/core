import { Feature, Point } from 'geojson'
import { MarkerManager } from './MarkerManager'
import { autocompleteGeocode, reverseGeocode } from './geocoding'

// Global marker manager instance for geocoder
let geocoderMarkerManager: MarkerManager | null = null

// Helper function to get or create the marker manager
const getGeocoderMarkerManager = (): MarkerManager => {
  if (!geocoderMarkerManager) {
    geocoderMarkerManager = new MarkerManager()
  }
  return geocoderMarkerManager
}

// Convert longitude and latitude into Municipality and Country Subdivision
export const getMunicipalityAndProvince = async (latitude: string, longitude: string, countryCode = 'CA') => {
  try {
    const features = await reverseGeocode(latitude, longitude, countryCode, { size: 1, coarse: true })

    if (features.length > 0) {
      const properties = features[0].properties as any

      const municipality = properties.locality || properties.neighbourhood || properties.county || ''
      const countrySubdivision = properties.region_a || properties.region || '' // region_a gives abbreviation like "ON", "BC"

      return { municipality, countrySubdivision }
    }

    return { municipality: '', countrySubdivision: '' }
  }
  catch (error) {
    console.error('Error fetching municipality and country subdivision:', error)
    return { municipality: '', countrySubdivision: '' }
  }
}

// Fetch address suggestions from the active autocomplete provider
export const fetchSuggestions = async (input: string, countryCode = 'CA') => {
  if (!input || input.length < 3) {
    return []
  }

  try {
    return await autocompleteGeocode(input, countryCode, 5)
  }
  catch (error) {
    console.error('Error fetching address suggestions:', error)
    return []
  }
}

// Parse location details for better display
export const parseLocation = (feature: Feature) => {
  const locationName = feature.properties?.name || ''
  const fullLabel = feature.properties?.label || ''

  // Try to extract location details from properties
  const properties = feature.properties
  let regionDetails = ''

  if (properties) {
    const locality = properties.locality
    const region = properties.region // Full countrySubdivision name
    const region_a = properties.region_a // CountrySubdivision abbreviation (ON, BC, etc.)
    const country = properties.country
    const country_a = properties.country_a // Country abbreviation (CA)

    // Build region details similar to your original format
    if (locality && region_a && country_a) {
      regionDetails = `${locality}, ${region_a}, ${country_a}`
    }
    else if (locality && region && country) {
      regionDetails = `${locality}, ${region}, ${country}`
    }
    else {
      // Fallback: try to extract from the full label
      const parts = fullLabel.split(', ')
      if (parts.length > 1) {
        regionDetails = parts.slice(1, 3).join(', ')
      }
    }
  }

  return {
    name: locationName,
    region: regionDetails,
    fullLabel: fullLabel,
  }
}

// Handle suggestion selection and map movement
export const handleLocationSelect = (feature: Feature, map: any, type: string, options?: { editing?: boolean }) => {
  const editing = options?.editing || false
  const markerManager = getGeocoderMarkerManager()

  // Handle feature with is_database_building flag
  if (type === 'dbBuilding') {
    const geometry = feature.geometry as Point
    const center = geometry.coordinates
    const addressData = {
      formatted_address: feature.properties?.label || '',
      coordinates: center,
      properties: feature.properties,
      building_id: feature.properties.gid?.replace('building-', ''),
      is_database_building: true,
    }

    if (map && center) {
      // Add marker to the center with editing capability
      markerManager.create(center as [number, number], map)

      map.flyTo({
        center: addressData.coordinates,
        zoom: 18,
        speed: 1.5,
      })
    }

    return addressData
  }

  // Calculate center coordinates
  let center

  // Use bbox if available (more precise for areas)
  if (feature.bbox) {
    center = [
      feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
      feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2,
    ]
  }
  // Otherwise extract coordinates based on geometry type
  else if (feature.geometry?.type === 'Point') {
    center = (feature.geometry as any).coordinates
  }

  const addressData = {
    formatted_address: feature.properties?.label || feature.properties?.name || '',
    coordinates: center,
    properties: feature.properties,
    address_details: {
      name: feature.properties?.name,
      label: feature.properties?.label,
      locality: feature.properties?.locality,
      neighbourhood: feature.properties?.neighbourhood,
      region: feature.properties?.region,
      region_a: feature.properties?.region_a,
      country: feature.properties?.country,
      country_a: feature.properties?.country_a,
      postalcode: feature.properties?.postalcode,
      housenumber: feature.properties?.housenumber,
      street: feature.properties?.street,
    },
    geocode_earth_id: feature.properties?.gid, // Geocode Earth's unique id
    layer: feature.properties?.layer, // Type of place (address, venue, locality, etc.)
    confidence: feature.properties?.confidence, // Geocode Earth's confidence score
    match_type: feature.properties?.match_type, // How well the result matches the query
  }

  if (map && center) {
    // Add marker to the center with editing capability
    markerManager.create(center as [number, number], map, { editing })

    if (feature.bbox) {
      map.fitBounds(feature.bbox, { speed: 2 })
    }
    else {
      map.flyTo({
        center: addressData.coordinates,
        zoom: 14, // Might be good idea to set zoom level depending on layer / type of place
        speed: 2,
      })
    }
  }

  return addressData
}

// Util function to get detailed address information
export const getDetailedAddress = async (coordinates: [number, number], countryCode = 'CA') => {
  const [longitude, latitude] = coordinates

  try {
    // Restrict to address-layer results (the original popover used layers=address) so
    // callers get a street address rather than the nearest venue/POI. Nominatim's zoom-18
    // reverse is already building-level, so this only refines the Pelias path.
    const features = await reverseGeocode(latitude.toString(), longitude.toString(), countryCode, { size: 1, layers: 'address' })
    return features.length > 0 ? features[0] : null
  }
  catch (error) {
    console.error('Error fetching detailed address:', error)
    return null
  }
}

// Convert a building object to a GeoJSON feature format compatible with handleLocationSelect
export const buildingToFeature = (building) => {
  const name = building.buildingName || ''

  // Validate coordinates - use the correct property names
  const longitude = Number.parseFloat(building.buildingLongitude)
  const latitude = Number.parseFloat(building.buildingLatitude)

  if (isNaN(longitude) || isNaN(latitude)) {
    console.error('Invalid building coordinates:', {
      longitude: building.buildingLongitude,
      latitude: building.buildingLatitude,
      buildingId: building.id,
    })
    return null
  }

  return {
    properties: {
      name: name,
      label: `${name}, ${[building.buildingAddress, building.buildingMunicipality, building.buildingCountrySubdivision].filter(Boolean).join(', ')}`,
      address: building.buildingAddress,
      municipality: building.buildingMunicipality,
      countrySubdivision: building.buildingCountrySubdivision,
      postalCode: building.buildingPostalCode,
      gid: `building-${building.id}`,
    },
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    is_database_building: true,
  }
}

// Enhanced marker creation with editing capabilities
export const createGeocoderMarker = (coordinates: [number, number], map: any, options?: { editing?: boolean }) => {
  const editing = options?.editing || false
  const markerManager = getGeocoderMarkerManager()
  markerManager.create(coordinates, map, { editing })
  return markerManager
}

// Helper function to remove the current marker
export const removeGeocoderMarker = (): void => {
  const markerManager = getGeocoderMarkerManager()
  markerManager.remove()
}
