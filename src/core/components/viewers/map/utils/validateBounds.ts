import type { LngLatBoundsLike } from 'maplibre-gl'

/**
 * Type guard to check if a value is a valid flat bounds array [minLng, minLat, maxLng, maxLat]
 */
const isValidFlatBounds = (value: unknown): value is [number, number, number, number] => (
  Array.isArray(value)
  && value.length === 4
  && value.every((n) => typeof n === 'number' && Number.isFinite(n))
)

/**
 * Type guard to check if a value is a valid nested bounds array [[minLng, minLat], [maxLng, maxLat]]
 */
const isValidNestedBounds = (value: unknown): value is [[number, number], [number, number]] => (
  Array.isArray(value)
  && value.length === 2
  && value.every((pair) => (
    Array.isArray(pair)
    && pair.length === 2
    && pair.every((n) => typeof n === 'number' && Number.isFinite(n))
  ))
)

/**
 * Resolves and validates bounds to a LngLatBoundsLike format.
 * Accepts bounds as an array (flat or nested) or as a JSON string.
 * Falls back to the provided fallback bounds if validation fails.
 *
 * @param bounds - The bounds to validate (can be an array or JSON string)
 * @param fallbackBounds - The bounds to use if validation fails
 * @returns Valid LngLatBoundsLike bounds
 */
export const resolveBounds = (
  bounds: unknown,
  fallbackBounds: LngLatBoundsLike
): LngLatBoundsLike => {
  if (isValidFlatBounds(bounds) || isValidNestedBounds(bounds)) {
    return bounds as LngLatBoundsLike
  }

  if (typeof bounds === 'string') {
    const trimmed = bounds.trim()
    if (trimmed.length === 0) {
      return fallbackBounds
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (isValidFlatBounds(parsed) || isValidNestedBounds(parsed)) {
        return parsed as LngLatBoundsLike
      }
    } catch {
      // fall back to fallbackBounds
    }
  }

  return fallbackBounds
}
