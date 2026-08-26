// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export const ARCGIS_BASE = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Administrative_Divisions/FeatureServer/0/query'

/**
 * Convert a hex colour (`#rgb`, `#rrggbb`, or without `#`) to an `rgba()` string.
 * Expands 3-digit shorthand and falls back to black on malformed input so the
 * MapLibre paint expression never receives a NaN channel.
 */
export function hexToRgba(hex: string, opacity: number): string {
  let clean = (hex ?? '').replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
  }
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(0, 0, 0, ${opacity})`
  }
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * Derive an ISO 3166-2 code from an ArcGIS admin-division feature's properties.
 * `ISO_CODE` arrives as the country code concatenated with the subdivision
 * (`CAON`), so the prefix is stripped and re-joined with a hyphen (`CA-ON`).
 */
export function subdivisionCodeFromFeature(
  properties?: Record<string, unknown> | null
): string | null {
  const isoCC = properties?.ISO_CC as string | undefined
  const isoCode = properties?.ISO_CODE as string | undefined
  if (isoCC && isoCode && isoCode.startsWith(isoCC)) {
    return `${isoCC}-${isoCode.slice(isoCC.length)}`
  }
  return (isoCode || (properties?.NAME as string | undefined) || null)
}

export const buildSubdivisionUrl = (countryCode: string, base: string = ARCGIS_BASE): string => {
  const params = new URLSearchParams({
    outFields: 'NAME,ISO_CC,ISO_CODE,ADMINTYPE',
    where: `ISO_CC='${countryCode}'`,
    f: 'geojson',
  })
  return `${base}?${params.toString()}`
}
