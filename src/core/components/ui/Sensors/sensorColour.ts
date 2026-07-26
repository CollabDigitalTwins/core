// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { lerpHex } from '../../../utils/colourUtils'

import { defaultPalette, getSensorTypeColors } from './sensorUtils'

import type { SensorType, SensorTypes } from '../../../types/dbTypes'

// Re-exported so consumers of the sensor colour model get the whole vocabulary from one import.
export { lerpHex } from '../../../utils/colourUtils'

/** The three configured stops of a sensor type's colour ramp. */
export interface ColourRamp {
  min: string
  mid: string
  max: string
}

/** The numeric range the ramp is stretched over. `max` is always greater than `min`. */
export interface ColourDomain {
  min: number
  max: number
}

/** A single gradient stop. `offset` is a 0..1 fraction, not a percentage string. */
export interface ColourStop {
  offset: number
  colour: string
}

type RampSource = Pick<SensorType, 'name' | 'minColour' | 'midColour' | 'maxColour'>
type DomainSource = Pick<SensorType, 'minValue' | 'maxValue'>

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)

const isFiniteNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

/**
 * Colours for a sensor type, in precedence order: explicit overrides, then the DB row's
 * `min/mid/maxColour`, then the per-type default keyed by type name, then the global fallback.
 *
 * Note the spelling split this bridges: the DB columns are British (`minColour`) while the
 * `SensorChart` props they override are American (`minColor`).
 */
export function resolveRamp(
  type?: RampSource | null,
  overrides?: { min?: string; mid?: string; max?: string },
): ColourRamp {
  const byName = type?.name ? getSensorTypeColors(type.name as `${SensorTypes}`) : defaultPalette
  return {
    min: overrides?.min || type?.minColour || byName.min,
    mid: overrides?.mid || type?.midColour || byName.mid,
    max: overrides?.max || type?.maxColour || byName.max,
  }
}

/** The min/max of the values actually observed, or null when there is nothing to measure. */
export function observedDomain(points: { value: number }[]): ColourDomain | null {
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    if (!isFiniteNumber(p.value)) continue
    if (p.value < min) min = p.value
    if (p.value > max) max = p.value
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  return { min, max }
}

/**
 * The domain to stretch the ramp over: the sensor type's configured range when it is usable,
 * otherwise the observed range.
 *
 * Returns `null` when neither yields a range with width, which is the "no colours configured"
 * signal. Every consumer must fall back to its pre-colour appearance on `null` rather than
 * inventing a domain, so an unconfigured type keeps rendering exactly as it does today.
 */
export function resolveDomain(
  type?: DomainSource | null,
  observed?: ColourDomain | null,
): ColourDomain | null {
  if (isFiniteNumber(type?.minValue) && isFiniteNumber(type?.maxValue) && type.maxValue > type.minValue) {
    return { min: type.minValue, max: type.maxValue }
  }
  if (observed && observed.max > observed.min) return observed
  return null
}

/**
 * The ramp colour for a value: min -> mid over the lower half of the domain, mid -> max over
 * the upper half. Values outside the domain clamp to its endpoint colours, so an out-of-range
 * reading reads as "at the limit" rather than wrapping around.
 */
export function colourForValue(value: number, ramp: ColourRamp, domain: ColourDomain): string {
  if (!isFiniteNumber(value)) return ramp.mid
  const span = domain.max - domain.min
  if (span <= 0) return ramp.mid
  const t = clamp01((value - domain.min) / span)
  return t <= 0.5 ? lerpHex(ramp.min, ramp.mid, t * 2) : lerpHex(ramp.mid, ramp.max, (t - 0.5) * 2)
}

/** 0..1 position of a value within the domain, for the legend caret. Clamped at both ends. */
export function valueOffset(value: number, domain: ColourDomain): number {
  const span = domain.max - domain.min
  if (span <= 0 || !isFiniteNumber(value)) return 0
  return clamp01((value - domain.min) / span)
}

/** The domain's low, middle and high values, in ascending order, for legend tick labels. */
export function domainTicks(domain: ColourDomain): number[] {
  return [domain.min, (domain.min + domain.max) / 2, domain.max]
}

/** Legend ramp stops, left (min) to right (max). Pairs with a horizontal CSS `linear-gradient`. */
export function rampStops(ramp: ColourRamp): ColourStop[] {
  return [
    { offset: 0, colour: ramp.min },
    { offset: 0.5, colour: ramp.mid },
    { offset: 1, colour: ramp.max },
  ]
}

/**
 * Stops for the chart's vertical `<linearGradient y1="0" y2="1">`, where offset 0 is the top of
 * the plot box (the highest visible value) and offset 1 the bottom.
 *
 * The plot box spans `yDomain`, which is generally not the colour `domain`, so the ramp's own
 * breakpoints are projected onto the box and the ends are pinned to their clamped colours. Since
 * `colourForValue` is piecewise linear in value and offset is linear in value, interpolating
 * between these stops reproduces `colourForValue` exactly rather than approximating it.
 */
export function gradientStopsForYDomain(
  ramp: ColourRamp,
  domain: ColourDomain,
  yDomain: ColourDomain,
): ColourStop[] {
  const ySpan = yDomain.max - yDomain.min
  // A flat series has no vertical extent to map a ramp onto: one colour for the whole fill.
  if (ySpan <= 0) {
    const flat = colourForValue(yDomain.max, ramp, domain)
    return [
      { offset: 0, colour: flat },
      { offset: 1, colour: flat },
    ]
  }

  const offsetFor = (value: number): number => (yDomain.max - value) / ySpan
  const stops: ColourStop[] = [
    { offset: 0, colour: colourForValue(yDomain.max, ramp, domain) },
    { offset: 1, colour: colourForValue(yDomain.min, ramp, domain) },
  ]

  // Only breakpoints that actually fall inside the visible box need their own stop; the rest
  // are already represented by the clamped ends.
  for (const value of domainTicks(domain)) {
    const offset = offsetFor(value)
    if (offset > 0 && offset < 1) {
      stops.push({ offset, colour: colourForValue(value, ramp, domain) })
    }
  }

  return stops.sort((a, b) => a.offset - b.offset)
}
