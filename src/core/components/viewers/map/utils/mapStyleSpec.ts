// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { MapStyle } from '../../../../types/map'
import type { StyleSpecification } from 'maplibre-gl'

/** MapTiler's public demo key. Honoured on localhost only, so dev works without an account. */
export const MAPTILER_PLACEHOLDER_KEY = 'get_your_own_OpIi9ZULNHzrESv6T2vL'

export const SATELLITE_STYLE_URL = 'cdt:satellite'
export const STREETS_STYLE_URL = 'cdt:streets'

const MAPTILER_ATTRIBUTION = '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
const ESRI_ATTRIBUTION = 'Imagery &copy; <a href="https://www.esri.com/" target="_blank">Esri</a>, Maxar, Earthstar Geographics'
const TERRARIUM_ATTRIBUTION = '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank">Terrain Tiles</a>, <a href="https://earth.jaxa.jp/en/data/policy/" target="_blank">AW3D30 (JAXA)</a>'

const ESRI_IMAGERY_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const TERRARIUM_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const OPENMAPTILES_GLYPHS = 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'

/** Falls back to the placeholder so a missing key degrades the map instead of breaking it. */
export function maptilerKeyOrPlaceholder(key?: string | null): string {
  const trimmed = (key ?? '').trim()
  return trimmed || MAPTILER_PLACEHOLDER_KEY
}

const hasOwnKey = (key?: string | null): boolean => Boolean((key ?? '').trim())

function satelliteImagerySource(key?: string | null) {
  if (!hasOwnKey(key)) {
    return {
      type: 'raster' as const,
      tiles: [ESRI_IMAGERY_TILES],
      tileSize: 256,
      maxzoom: 19,
      attribution: ESRI_ATTRIBUTION,
    }
  }
  return {
    type: 'raster' as const,
    tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${(key ?? '').trim()}`],
    tileSize: 256,
    maxzoom: 16,
    attribution: MAPTILER_ATTRIBUTION,
  }
}

function elevationSource(key?: string | null) {
  if (!hasOwnKey(key)) {
    return {
      type: 'raster-dem' as const,
      tiles: [TERRARIUM_TILES],
      encoding: 'terrarium' as const,
      tileSize: 256,
      maxzoom: 12,
      attribution: TERRARIUM_ATTRIBUTION,
    }
  }
  return {
    type: 'raster-dem' as const,
    url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${(key ?? '').trim()}`,
    tileSize: 256,
  }
}

/**
 * Build the Satellite base style for a deployment's own MapTiler key.
 * Without a key it falls back to Esri imagery, terrarium elevation and the
 * OpenMapTiles font CDN, so nothing is billed to another account.
 */
export function buildSatelliteStyle(key?: string | null): StyleSpecification {
  return {
    version: 8,
    id: 'satellite',
    name: 'Satellite',
    glyphs: hasOwnKey(key)
      ? `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${(key ?? '').trim()}`
      : OPENMAPTILES_GLYPHS,
    sources: {
      'raster-tiles': satelliteImagerySource(key),
      terrainSource: elevationSource(key),
      hillshadeSource: elevationSource(key),
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        layout: { visibility: 'visible' },
        paint: { 'background-color': '#1a1a1a' },
      },
      {
        id: 'simple-tiles',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 24,
        paint: { 'raster-brightness-min': 0.15 },
      },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'hillshadeSource',
        layout: { visibility: 'visible' },
        paint: {
          'hillshade-shadow-color': 'rgba(0, 0, 0, 0.3)',
          'hillshade-highlight-color': 'rgba(255, 255, 255, 0.3)',
          'hillshade-exaggeration': 0.5,
        },
      },
    ],
    sky: {
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
    },
    light: {
      anchor: 'viewport',
      color: '#ffffff',
      intensity: 0.6,
      position: [1.15, 0, 0],
    },
    terrain: { source: 'terrainSource', exaggeration: 0.6 },
  } as StyleSpecification
}

const LEGACY_STATIC_STYLES: Record<string, string> = {
  'mapStyles/satellite.json': SATELLITE_STYLE_URL,
  'mapStyles/streets.json': STREETS_STYLE_URL,
}

function normalizeStyleUrl(url: string): string {
  const legacy = Object.keys(LEGACY_STATIC_STYLES).find((path) => url.endsWith(path))
  return legacy ? LEGACY_STATIC_STYLES[legacy] : url
}

/**
 * Resolve a catalog entry into something `<Map mapStyle>` accepts: a built style
 * object for the built-in Satellite, a keyed URL for Streets, and any other URL
 * (organization-supplied styles included) unchanged.
 */
export function resolveStyleSpec(
  style: MapStyle,
  key?: string | null
): string | StyleSpecification {
  const url = normalizeStyleUrl((style?.url ?? '').trim())

  if (url === SATELLITE_STYLE_URL) return buildSatelliteStyle(key)
  if (url === STREETS_STYLE_URL) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKeyOrPlaceholder(key)}`
  }
  return url
}
