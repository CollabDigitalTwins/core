import { Feature } from 'geojson'
import { USE_PELIAS } from './config'
import { peliasAutocomplete, peliasReverse } from './pelias'
import { photonAutocomplete, nominatimReverse } from './osm'

// Provider-agnostic entry points. The active provider is resolved once in ./config
// from env vars; everything downstream consumes Pelias-shaped features regardless.

export const autocompleteGeocode = (text: string, countryCode: string, size: number): Promise<Feature[]> =>
  USE_PELIAS ? peliasAutocomplete(text, countryCode, size) : photonAutocomplete(text, countryCode, size)

export const reverseGeocode = (
  latitude: string,
  longitude: string,
  countryCode: string,
  { size = 1, coarse = false }: { size?: number; coarse?: boolean } = {},
): Promise<Feature[]> =>
  USE_PELIAS
    ? peliasReverse(latitude, longitude, countryCode, { size, coarse })
    : nominatimReverse(latitude, longitude, { coarse })
