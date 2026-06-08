import { Feature } from 'geojson'
import { PHOTON_URL, NOMINATIM_URL } from './config'
import { normalizePhotonFeature, normalizeNominatimResult } from './adapters'

// Free, no-key public OSM fallbacks. Photon serves autocomplete (it is built for
// per-keystroke search); Nominatim serves reverse lookups (occasional, single point).

export const photonAutocomplete = async (text: string, countryCode: string | undefined, size: number): Promise<Feature[]> => {
  // Photon has no country filter, so over-fetch and post-filter by country code.
  const params = new URLSearchParams({ q: text, limit: String(size * 2), lang: 'en' })

  const response = await fetch(`${PHOTON_URL}/api?${params}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  const data = await response.json()
  let features: Feature[] = (data.features || []).map(normalizePhotonFeature)

  if (countryCode) {
    const cc = countryCode.toUpperCase()
    const inCountry = features.filter(f => {
      const ca = (f.properties as any)?.country_a
      return !ca || ca === cc
    })
    if (inCountry.length) features = inCountry
  }

  return features.slice(0, size)
}

export const nominatimReverse = async (
  latitude: string,
  longitude: string,
  { coarse }: { coarse: boolean },
): Promise<Feature[]> => {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: latitude,
    lon: longitude,
    addressdetails: '1',
    zoom: coarse ? '10' : '18', // coarse -> city level, otherwise building level
  })

  const response = await fetch(`${NOMINATIM_URL}/reverse?${params}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  const data = await response.json()
  if (!data || data.error || data.lat == null) return []
  return [normalizeNominatimResult(data)]
}
