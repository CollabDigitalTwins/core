// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Flat bounds `[minLng, minLat, maxLng, maxLat]` — the only shape `<Map maxBounds>` accepts. */
export type FlatBounds = [number, number, number, number]

type NestedBounds = [[number, number], [number, number]]

const isValidFlatBounds = (value: unknown): value is FlatBounds => (
  Array.isArray(value)
  && value.length === 4
  && value.every((n) => typeof n === 'number' && Number.isFinite(n))
)

const isValidNestedBounds = (value: unknown): value is NestedBounds => (
  Array.isArray(value)
  && value.length === 2
  && value.every((pair) => (
    Array.isArray(pair)
    && pair.length === 2
    && pair.every((n) => typeof n === 'number' && Number.isFinite(n))
  ))
)

const flatten = ([[minLng, minLat], [maxLng, maxLat]]: NestedBounds): FlatBounds => (
  [minLng, minLat, maxLng, maxLat]
)

/**
 * Validates flat or nested bounds, given as an array or a JSON string, and normalises to flat.
 * Invalid input resolves to `fallbackBounds`, which may be `undefined` — no panning restriction.
 */
export const resolveBounds = (
  bounds: unknown,
  fallbackBounds?: FlatBounds
): FlatBounds | undefined => {
  if (isValidFlatBounds(bounds)) return bounds
  if (isValidNestedBounds(bounds)) return flatten(bounds)

  if (typeof bounds === 'string') {
    const trimmed = bounds.trim()
    if (trimmed.length === 0) {
      return fallbackBounds
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (isValidFlatBounds(parsed)) return parsed
      if (isValidNestedBounds(parsed)) return flatten(parsed)
    } catch {
      // fall back to fallbackBounds
    }
  }

  return fallbackBounds
}
