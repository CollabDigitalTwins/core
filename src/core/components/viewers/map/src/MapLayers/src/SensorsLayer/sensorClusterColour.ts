// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { ColourDomain, ColourRamp } from '../../../../../../ui/Sensors/sensorColour'
import type { PaintValue } from '../mapLayersUtils'

/**
 * Cluster accumulators for averaging sensor readings.
 *
 * Passed to the GeoJSON source once and never changed: MapLibre bakes `clusterProperties` in at
 * source creation, so they have to cover the case where no sensor carries a value yet. Features
 * without a `value` contribute nothing and are not counted.
 */
export const SENSOR_CLUSTER_PROPERTIES = {
  valueSum: ['+', ['coalesce', ['get', 'value'], 0]],
  valueCount: ['+', ['case', ['has', 'value'], 1, 0]],
} as const

/**
 * `circle-color` for the sensor cluster bubbles: the mean of the readings inside the cluster, on
 * the type's ramp, so a cluster reads like a zoomed-out version of the badges and halos under it.
 *
 * Falls back to `fallback` for a cluster where nothing reported, and when the type has no usable
 * domain, honouring the same "no colours configured" contract as the rest of the ramp code.
 */
export function sensorClusterColour(
  ramp: ColourRamp | null | undefined,
  domain: ColourDomain | null | undefined,
  fallback: PaintValue,
): PaintValue {
  if (!ramp || !domain || !(domain.max > domain.min)) return fallback

  const mid = (domain.min + domain.max) / 2
  const average: PaintValue = [
    '/',
    ['get', 'valueSum'],
    // Guard the divide: the branch below only runs when the count is positive, but MapLibre
    // still type-checks and evaluates both arms of a `case`.
    ['max', ['get', 'valueCount'], 1],
  ]

  return [
    'case',
    ['>', ['get', 'valueCount'], 0],
    ['interpolate', ['linear'], average,
      domain.min, ramp.min,
      mid, ramp.mid,
      domain.max, ramp.max],
    fallback,
  ]
}
