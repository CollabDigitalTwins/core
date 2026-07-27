// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { toDisplayString } from '../../../../../utils/utils'

import { getGeocodingConfig } from './config'
import { photonAutocomplete, nominatimReverse } from './osm'
import { peliasAutocomplete, peliasReverse } from './pelias'

import type { Feature } from 'geojson'

// Provider-agnostic entry points. The preferred provider (Geocode Earth or a
// self-hosted Pelias) is resolved in ./config from runtime-injected values;
// if it fails we fall back to the free public OSM services so address search
// keeps working.
//
// A bad/expired/origin-restricted key surfaces as a 401/403. Autocomplete fires
// on every keystroke, so once we see an auth failure we stop retrying the keyed
// provider for the rest of the session and serve results directly from public OSM.
let peliasAuthFailed = false

const peliasActive = (): boolean => getGeocodingConfig().usePelias && !peliasAuthFailed

const isAuthError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : toDisplayString(error)
  return message.includes('401') || message.includes('403')
}

const handlePeliasFailure = (error: unknown, fallbackName: string): void => {
  if (isAuthError(error)) {
    peliasAuthFailed = true
    console.warn(
      `Geocoder: the configured provider rejected the API key (auth error). ` +
      `Falling back to public OSM services (Photon/Nominatim) for the rest of this session.`,
    )
  } else {
    console.warn(`Geocoder: provider request failed; falling back to ${fallbackName}.`, error)
  }
}

export const autocompleteGeocode = async (text: string, countryCode: string, size: number): Promise<Feature[]> => {
  if (peliasActive()) {
    try {
      return await peliasAutocomplete(text, countryCode, size)
    }
    catch (error) {
      handlePeliasFailure(error, 'Photon')
    }
  }
  return photonAutocomplete(text, countryCode, size)
}

export const reverseGeocode = async (
  latitude: string,
  longitude: string,
  countryCode: string,
  { size = 1, coarse = false, layers }: { size?: number; coarse?: boolean; layers?: string } = {},
): Promise<Feature[]> => {
  if (peliasActive()) {
    try {
      return await peliasReverse(latitude, longitude, countryCode, { size, coarse, layers })
    }
    catch (error) {
      handlePeliasFailure(error, 'Nominatim')
    }
  }
  return nominatimReverse(latitude, longitude, { coarse })
}
