// ---------------------------------------------------------------------------
// Geocoding provider resolution
//
// Geocode Earth is hosted Pelias, so it and a self-hosted Pelias instance share
// one code path (`/v1/autocomplete`, `/v1/reverse`, and the same response shape).
// When neither a key nor a self-hosted URL is configured we fall back to free,
// no-key public OSM services so self-hosters get working geocoding out of the box:
//   - autocomplete -> Photon (komoot), which is built for per-keystroke search.
//   - reverse      -> Nominatim, fine for occasional point lookups.
// (Nominatim's usage policy forbids autocomplete-style traffic, which is why
//  Photon handles suggestions.) Both responses are normalized by ./adapters into
// the Pelias property shape (`locality`, `region_a`, `country_a`, `label`, ...)
// that parseLocation / handleLocationSelect already expect.
// ---------------------------------------------------------------------------

export const GEOCODE_EARTH_API_KEY = process.env.NEXT_PUBLIC_GEOCODE_EARTH_API_KEY
// Self-hosted Pelias-compatible endpoint (no key). e.g. https://pelias.example.com
const PELIAS_URL = process.env.NEXT_PUBLIC_GEOCODER_URL
// Public OSM fallbacks. Default to the community instances; self-hosters can point at
// their own Photon/Nominatim via env to avoid the public instances' rate limits.
export const PHOTON_URL = process.env.NEXT_PUBLIC_PHOTON_URL || 'https://photon.komoot.io'
export const NOMINATIM_URL = process.env.NEXT_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org'

// Key wins (best quality), then self-hosted Pelias, otherwise public OSM.
export const PELIAS_BASE = GEOCODE_EARTH_API_KEY ? 'https://api.geocode.earth' : PELIAS_URL || null
export const USE_PELIAS = Boolean(PELIAS_BASE)
