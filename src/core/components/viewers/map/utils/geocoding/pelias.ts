import { Feature } from 'geojson'
import { GEOCODE_EARTH_API_KEY, PELIAS_BASE } from './config'

// Geocode Earth and self-hosted Pelias share this dialect; only the base URL and
// the (optional) api_key differ. Responses already match the shape the app expects.

export const peliasAutocomplete = async (text: string, countryCode: string, size: number): Promise<Feature[]> => {
  const params = new URLSearchParams({
    'text': text,
    'boundary.country': countryCode.toUpperCase(),
    'size': String(size),
  })
  if (GEOCODE_EARTH_API_KEY) params.set('api_key', GEOCODE_EARTH_API_KEY)

  const response = await fetch(`${PELIAS_BASE}/v1/autocomplete?${params}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  const geojson = await response.json()
  return geojson.features?.length ? geojson.features : []
}

export const peliasReverse = async (
  latitude: string,
  longitude: string,
  countryCode: string,
  { size, coarse }: { size: number; coarse: boolean },
): Promise<Feature[]> => {
  const params = new URLSearchParams({
    'point.lat': latitude,
    'point.lon': longitude,
    'boundary.country': countryCode.toUpperCase(),
    'size': String(size),
  })
  if (coarse) params.set('layers', 'coarse')
  if (GEOCODE_EARTH_API_KEY) params.set('api_key', GEOCODE_EARTH_API_KEY)

  const response = await fetch(`${PELIAS_BASE}/v1/reverse?${params}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  const data = await response.json()
  return data.features?.length ? data.features : []
}
