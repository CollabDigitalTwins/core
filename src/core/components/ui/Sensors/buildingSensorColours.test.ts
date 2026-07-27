// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import {
  activeLegendTypeId,
  buildingColoursKey,
  buildingLatestTimes,
  buildingSensorAverages,
  typeDomain,
} from './buildingSensorColours'

import type { SensorSeries } from './sensorData'
import type { SensorType } from '../../../types/dbTypes'

const series = (values: number[]): SensorSeries => ({
  points: values.map((value, i) => ({ t: i * 1000, value })),
})

// Black -> grey -> white over 0..100, so interpolation is readable by eye.
const greyType: SensorType = {
  id: 10,
  name: 'Temperature',
  icon: 'Thermometer',
  minValue: 0,
  maxValue: 100,
  minColour: '#000000',
  midColour: '#808080',
  maxColour: '#ffffff',
}

/** Degenerate configured range, so the domain has to come from the observed values. */
const unconfiguredType: SensorType = { ...greyType, id: 20, name: 'Humidity', minValue: 0, maxValue: 0 }

const sensor = (id: number, typeId: number | null, buildingId: number | null) =>
  ({ id, typeId, buildingId })

describe('buildingSensorAverages', () => {
  it('averages the latest readings of a building sensors of that type', () => {
    const averages = buildingSensorAverages(
      [sensor(1, 10, 100), sensor(2, 10, 100)],
      greyType,
      new Map([[1, series([90, 0])], [2, series([100])]]),
    )
    expect(averages.get(100)).toEqual({
      buildingId: 100,
      average: 50,
      sensorCount: 2,
      colour: '#808080',
    })
  })

  it('reads only the latest point of each series', () => {
    const averages = buildingSensorAverages(
      [sensor(1, 10, 100)],
      greyType,
      new Map([[1, series([0, 0, 100])]]),
    )
    expect(averages.get(100)?.average).toBe(100)
  })

  it('keeps buildings separate', () => {
    const averages = buildingSensorAverages(
      [sensor(1, 10, 100), sensor(2, 10, 200)],
      greyType,
      new Map([[1, series([0])], [2, series([100])]]),
    )
    expect(averages.get(100)?.colour).toBe('#000000')
    expect(averages.get(200)?.colour).toBe('#ffffff')
  })

  it('ignores sensors of another type and sensors with no type', () => {
    const averages = buildingSensorAverages(
      [sensor(1, 10, 100), sensor(2, 20, 100), sensor(3, null, 100)],
      greyType,
      new Map([[1, series([0])], [2, series([100])], [3, series([100])]]),
    )
    expect(averages.get(100)).toMatchObject({ average: 0, sensorCount: 1 })
  })

  it('ignores sensors attached to no building', () => {
    const averages = buildingSensorAverages(
      [sensor(1, 10, null)],
      greyType,
      new Map([[1, series([50])]]),
    )
    expect(averages.size).toBe(0)
  })

  it('omits a building whose sensors have no readings yet', () => {
    const averages = buildingSensorAverages(
      [sensor(1, 10, 100)],
      greyType,
      new Map([[1, series([])]]),
    )
    expect(averages.size).toBe(0)
  })

  it('drops a non-finite reading but still averages the rest', () => {
    const averages = buildingSensorAverages(
      [sensor(1, 10, 100), sensor(2, 10, 100)],
      greyType,
      new Map([[1, series([Number.NaN])], [2, series([100])]]),
    )
    expect(averages.get(100)).toMatchObject({ average: 100, sensorCount: 1 })
  })

  it('returns nothing when no type is selected', () => {
    const averages = buildingSensorAverages(
      [sensor(1, 10, 100)],
      undefined,
      new Map([[1, series([50])]]),
    )
    expect(averages.size).toBe(0)
  })

  it('returns nothing when the type has no usable domain', () => {
    // Degenerate configured range and a single constant reading: nothing to interpolate over,
    // so callers must keep their default colour rather than get a meaningless one.
    const averages = buildingSensorAverages(
      [sensor(1, 20, 100)],
      unconfiguredType,
      new Map([[1, series([42])]]),
    )
    expect(averages.size).toBe(0)
  })

  it('falls back to the observed range when the configured one is degenerate', () => {
    const averages = buildingSensorAverages(
      [sensor(1, 20, 100), sensor(2, 20, 200)],
      unconfiguredType,
      new Map([[1, series([0])], [2, series([10])]]),
    )
    expect(averages.get(100)?.colour).toBe('#000000')
    expect(averages.get(200)?.colour).toBe('#ffffff')
  })

  it('clamps an average outside the configured domain to the end colour', () => {
    const averages = buildingSensorAverages(
      [sensor(1, 10, 100), sensor(2, 10, 200)],
      greyType,
      new Map([[1, series([-40])], [2, series([260])]]),
    )
    expect(averages.get(100)?.colour).toBe('#000000')
    expect(averages.get(200)?.colour).toBe('#ffffff')
  })
})

describe('typeDomain', () => {
  it('prefers the configured range over the observed one', () => {
    expect(typeDomain(greyType, new Map([[1, series([20, 30])]]))).toEqual({ min: 0, max: 100 })
  })

  it('falls back to the observed range', () => {
    expect(typeDomain(unconfiguredType, new Map([[1, series([20, 30])]]))).toEqual({ min: 20, max: 30 })
  })

  it('is null with no type', () => {
    expect(typeDomain(null, new Map([[1, series([20, 30])]]))).toBeNull()
  })
})

describe('buildingLatestTimes', () => {
  it('takes the most recent reading time across a building sensors', () => {
    // series() stamps points at index * 1000, so three points end at t = 2000.
    const times = buildingLatestTimes(
      [sensor(1, 10, 100), sensor(2, 10, 100)],
      new Map([[1, series([1])], [2, series([1, 2, 3])]]),
    )
    expect(times.get(100)).toBe(2000)
  })

  it('omits a building whose sensors have no points', () => {
    expect(buildingLatestTimes([sensor(1, 10, 100)], new Map([[1, series([])]])).size).toBe(0)
  })

  it('ignores sensors with no building', () => {
    expect(buildingLatestTimes([sensor(1, 10, null)], new Map([[1, series([1])]])).size).toBe(0)
  })
})

describe('activeLegendTypeId', () => {
  it('returns the pinned type when it is switched on', () => {
    expect(activeLegendTypeId(10, [10, 20])).toBe(10)
  })

  it('returns null when the pinned type is switched off', () => {
    expect(activeLegendTypeId(10, [20])).toBeNull()
  })

  it('returns null when nothing is pinned', () => {
    expect(activeLegendTypeId(null, [10])).toBeNull()
    expect(activeLegendTypeId(undefined, [10])).toBeNull()
  })

  it('returns null when the viewer has no visible types', () => {
    expect(activeLegendTypeId(10, undefined)).toBeNull()
  })
})

describe('buildingColoursKey', () => {
  const averages = (entries: [number, string][]) =>
    new Map(entries.map(([buildingId, colour]) => [
      buildingId,
      { buildingId, colour, average: 0, sensorCount: 1 },
    ]))

  it('ignores insertion order', () => {
    expect(buildingColoursKey(averages([[1, '#aaa'], [2, '#bbb']])))
      .toBe(buildingColoursKey(averages([[2, '#bbb'], [1, '#aaa']])))
  })

  it('changes when a colour changes', () => {
    expect(buildingColoursKey(averages([[1, '#aaa']])))
      .not.toBe(buildingColoursKey(averages([[1, '#abc']])))
  })

  it('is empty for no colours', () => {
    expect(buildingColoursKey(new Map())).toBe('')
  })
})
