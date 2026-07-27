// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { CLUSTER_COUNT_COLOUR } from '../mapLayersUtils'

import { SENSOR_CLUSTER_PROPERTIES, sensorClusterColour } from './sensorClusterColour'

const ramp = { min: '#000000', mid: '#808080', max: '#ffffff' }
const domain = { min: 0, max: 100 }

describe('sensorClusterColour', () => {
  it('falls back to the count colours when there is no ramp or domain', () => {
    expect(sensorClusterColour(null, domain, CLUSTER_COUNT_COLOUR)).toBe(CLUSTER_COUNT_COLOUR)
    expect(sensorClusterColour(ramp, null, CLUSTER_COUNT_COLOUR)).toBe(CLUSTER_COUNT_COLOUR)
  })

  it('falls back when the domain has no width', () => {
    expect(sensorClusterColour(ramp, { min: 5, max: 5 }, CLUSTER_COUNT_COLOUR))
      .toBe(CLUSTER_COUNT_COLOUR)
  })

  it('interpolates the ramp over the mean of the cluster readings', () => {
    expect(sensorClusterColour(ramp, domain, CLUSTER_COUNT_COLOUR)).toEqual([
      'case',
      ['>', ['get', 'valueCount'], 0],
      [
        'interpolate', ['linear'],
        ['/', ['get', 'valueSum'], ['max', ['get', 'valueCount'], 1]],
        0, '#000000',
        50, '#808080',
        100, '#ffffff',
      ],
      CLUSTER_COUNT_COLOUR,
    ])
  })

  it('keeps the fallback for a cluster where nothing reported', () => {
    const expr = sensorClusterColour(ramp, domain, CLUSTER_COUNT_COLOUR) as unknown[]
    expect(expr[3]).toBe(CLUSTER_COUNT_COLOUR)
  })

  it('places the mid stop between the ends for an offset domain', () => {
    const expr = sensorClusterColour(ramp, { min: 10, max: 30 }, CLUSTER_COUNT_COLOUR) as unknown[]
    const interpolate = expr[2] as unknown[]
    expect(interpolate.slice(3)).toEqual([10, '#000000', 20, '#808080', 30, '#ffffff'])
  })
})

describe('SENSOR_CLUSTER_PROPERTIES', () => {
  it('sums values and counts only the features that carry one', () => {
    expect(SENSOR_CLUSTER_PROPERTIES.valueSum).toEqual(['+', ['coalesce', ['get', 'value'], 0]])
    expect(SENSOR_CLUSTER_PROPERTIES.valueCount).toEqual(['+', ['case', ['has', 'value'], 1, 0]])
  })
})
