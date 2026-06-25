// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// ---------------------------------------------------------------------------
// Geocoding provider resolution
//
// Values are injected at runtime via setGeocodingConfig() (called by
// useGeocodingRuntimeConfig) rather than read from process.env at build time.
// This allows the pre-built Docker image to pick up env vars at container
// start without webpack baking empty strings into the client bundle.
//
// Geocode Earth is hosted Pelias, so it and a self-hosted Pelias instance share
// one code path (/v1/autocomplete, /v1/reverse, and the same response shape).
// When neither a key nor a self-hosted URL is configured we fall back to free,
// no-key public OSM services so self-hosters get working geocoding out of the box:
//   - autocomplete -> Photon (komoot), built for per-keystroke search.
//   - reverse      -> Nominatim, fine for occasional point lookups.
// ---------------------------------------------------------------------------

let _geocodeEarthApiKey: string | undefined = undefined
let _geocoderUrl: string | undefined = undefined
let _photonUrl: string = 'https://photon.komoot.io'
let _nominatimUrl: string = 'https://nominatim.openstreetmap.org'

export type GeocodingRuntimeConfig = {
  geocodeEarthApiKey?: string
  geocoderUrl?: string
  photonUrl?: string
  nominatimUrl?: string
}

export function setGeocodingConfig(cfg: GeocodingRuntimeConfig): void {
  // Treat empty strings the same as undefined so we don't use blank API keys
  _geocodeEarthApiKey = cfg.geocodeEarthApiKey || undefined
  _geocoderUrl = cfg.geocoderUrl || undefined
  if (cfg.photonUrl) _photonUrl = cfg.photonUrl
  if (cfg.nominatimUrl) _nominatimUrl = cfg.nominatimUrl
}

export function getGeocodingConfig() {
  const peliasBase = _geocodeEarthApiKey
    ? 'https://api.geocode.earth'
    : _geocoderUrl || null

  return {
    geocodeEarthApiKey: _geocodeEarthApiKey,
    peliasBase,
    usePelias: Boolean(peliasBase),
    photonUrl: _photonUrl,
    nominatimUrl: _nominatimUrl,
  }
}
