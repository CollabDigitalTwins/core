// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export type PlaceLevel = 'country' | 'countrySubdivision' | 'municipality' | 'address'

/** Parent names that disambiguate a place search; each is optional. */
export interface PlaceContext {
  country?: string
  countrySubdivision?: string
  municipality?: string
}

const ALPHA2 = /^[a-z]{2}$/i

export const isCountryCode = (value?: string): value is string => !!value && ALPHA2.test(value)

/** `CA-ON` (camera tracking) and `ON` (geocoder) both name Ontario; queries want the bare code. */
export const normalizeSubdivision = (value?: string | null): string => {
  const trimmed = (value ?? '').trim()
  const match = /^[a-z]{2}-(.+)$/i.exec(trimmed)
  return match ? match[1] : trimmed
}

/** The country an ISO 3166-2 code names: `CA-ON` → `CA`, or '' for a bare code. */
export const subdivisionCountry = (value?: string | null): string =>
  /^([a-z]{2})-/i.exec((value ?? '').trim())?.[1].toUpperCase() ?? ''

/** Candidates fetched per search, so the first one inside the parent subdivision can win. */
export const PLACE_CANDIDATES = 5

const fold = (value: unknown) => (typeof value === 'string' ? value : '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()

/** False only when the feature names a subdivision other than the one asked for; missing data passes. */
export function matchesContext(properties: Record<string, unknown> | null | undefined, context: PlaceContext): boolean {
  const wanted = fold(context.countrySubdivision)
  const regions = [properties?.region_a, properties?.region].map(fold).filter(Boolean)
  return !wanted || regions.length === 0 || regions.includes(wanted)
}
