// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { SATELLITE_STYLE_URL, STREETS_STYLE_URL } from './mapStyleSpec'

import type { MapStyle } from '../../../../types/map'

/**
 * Built-in map style catalog that is always available.
 * The two `cdt:` entries are sentinels resolved by `resolveStyleSpec` against the
 * deployment's own MapTiler key, so no key ever reaches React state or the URL.
 */
export const BUILT_IN_MAP_STYLES: MapStyle[]  = [
  { name: 'Satellite', url: SATELLITE_STYLE_URL },
  { name: 'Streets', url: STREETS_STYLE_URL },
  { name: 'Dark', url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  { name: 'Positron', url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
  { name: 'Maplibre', url: 'https://demotiles.maplibre.org/style.json' },
]

/**
 * The default/fallback map style used when no style is selected or organization config is unavailable.
 */
export const DEFAULT_MAP_STYLE: MapStyle = BUILT_IN_MAP_STYLES[0]; // Satellite

/**
 * Type guard to check if a value is a valid map style object.
 */
const isValidMapStyle = (value: unknown): value is MapStyle => {
  return (
    value !== null
    && typeof value === 'object'
    && typeof (value as any).url === 'string'
    && typeof (value as any).name === 'string'
  )
}

/**
 * Type guard to check if a string is a valid style URL format.
 */
const isValidStyleUrl = (url: string): boolean => {
  try {
    new URL(url)
    return /\.(json|geojson)$/i.test(url) || url.includes('://')
  } catch {
    return false
  }
}

/**
 * Normalizes and validates a single style entry from organization config.
 * Returns a valid MapStyle or null if the entry is invalid.
 *
 * @param style - Raw style data from organization config
 * @returns Valid MapStyle or null
 */
function normalizeStyleEntry(style: unknown): MapStyle | null {
  if (isValidMapStyle(style)) {
    const url = style.url.trim()
    if (isValidStyleUrl(url)) {
      return {
        name: String(style.name).substring(0, 100).trim(),
        url,
      }
    }
  }

  // Attempt recovery: if it's just a URL string, generate a name
  if (typeof style === 'string') {
    const url = style.trim()
    if (isValidStyleUrl(url)) {
      const styleName = url.replace('.json', '').split('/').pop() || 'Custom'
      return {
        name: styleName.charAt(0).toUpperCase() + styleName.slice(1),
        url,
      }
    }
  }

  return null
}

/**
 * Builds the complete map styles array by merging built-in styles with validated organization styles.
 * Deduplicates by URL, always keeps built-ins, and appends validated org styles.
 *
 * @param organizationStyles - Raw styles from organization config (unknown[])
 * @returns Array of valid MapStyle objects, always includes built-in styles
 */
export function buildMapStylesCatalog(organizationStyles: unknown): MapStyle[] {
  const catalog: MapStyle[] = [...BUILT_IN_MAP_STYLES]

  if (!Array.isArray(organizationStyles) || organizationStyles.length === 0) {
    return catalog
  }

  const invalidEntries: unknown[] = []

  organizationStyles.forEach((style) => {
    const normalized = normalizeStyleEntry(style)

    if (normalized) {
      // Deduplicate by URL
      if (!catalog.some((s) => s.url === normalized.url)) {
        catalog.push(normalized)
      }
    } else {
      invalidEntries.push(style)
    }
  })

  // Log a warning if any entries were invalid (non-blocking)
  if (invalidEntries.length > 0) {
    console.warn(
      `[Map Styles] Dropped ${invalidEntries.length} invalid organization style entries:`,
      invalidEntries
    )
  }

  return catalog
}

/**
 * Resolves the current map style safely.
 * If the current style URL is not in the catalog, falls back to the default.
 *
 * @param currentStyle - The currently selected map style
 * @param catalog - Available map styles
 * @returns Valid MapStyle from catalog or default
 */
export function resolveMapStyle(
  currentStyle: MapStyle | null | undefined,
  catalog: MapStyle[]
): MapStyle {
  if (!currentStyle) {
    return DEFAULT_MAP_STYLE
  }

  // Check if current style is in catalog by URL
  const found = catalog.find((s) => s.url === currentStyle.url)
  return found || DEFAULT_MAP_STYLE
}
