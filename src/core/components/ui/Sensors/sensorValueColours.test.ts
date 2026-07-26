// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { readingsKey, valueColoursBySensor } from './sensorValueColours'

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

const unconfiguredType: SensorType = {
  ...greyType,
  id: 20,
  name: 'Humidity',
  minValue: 0,
  maxValue: 0,
}

const sensor = (id: number, typeId: number | null) => ({ id, typeId })

describe('valueColoursBySensor', () => {
  it('colours each sensor by its latest value against its type domain', () => {
    const readings = valueColoursBySensor(
      [sensor(1, 10), sensor(2, 10)],
      [greyType],
      new Map([
        [1, series([0, 50])],
        [2, series([100])],
      ]),
    )
    expect(readings.get(1)).toEqual({ value: 50, colour: '#808080' })
    expect(readings.get(2)).toEqual({ value: 100, colour: '#ffffff' })
  })

  it('resolves each type independently', () => {
    const other: SensorType = { ...greyType, id: 30, minValue: 0, maxValue: 10 }
    const readings = valueColoursBySensor(
      [sensor(1, 10), sensor(2, 30)],
      [greyType, other],
      new Map([[1, series([5])], [2, series([5])]]),
    )
    // 5 of 100 is near the low end; 5 of 10 is the exact midpoint.
    expect(readings.get(1)?.colour).not.toBe('#808080')
    expect(readings.get(2)?.colour).toBe('#808080')
  })

  it('falls back to the range observed across that type when the type range is degenerate', () => {
    const readings = valueColoursBySensor(
      [sensor(1, 20), sensor(2, 20)],
      [unconfiguredType],
      new Map([[1, series([10])], [2, series([20])]]),
    )
    // Observed across the type is 10..20, so 10 is the low end and 20 the high end.
    expect(readings.get(1)?.colour).toBe('#000000')
    expect(readings.get(2)?.colour).toBe('#ffffff')
  })

  it('omits a type with no usable domain at all', () => {
    const readings = valueColoursBySensor(
      [sensor(1, 20)],
      [unconfiguredType],
      // A single constant reading gives an observed range with no width.
      new Map([[1, series([7])]]),
    )
    expect(readings.size).toBe(0)
  })

  it('omits sensors with no type, no series, or an unknown type', () => {
    const readings = valueColoursBySensor(
      [sensor(1, 10), sensor(2, null), sensor(3, 10), sensor(4, 999)],
      [greyType],
      new Map([[1, series([50])]]),
    )
    expect([...readings.keys()]).toEqual([1])
  })

  it('omits sensors whose series has no points', () => {
    const readings = valueColoursBySensor(
      [sensor(1, 10), sensor(2, 10)],
      [greyType],
      new Map([[1, series([50])], [2, { points: [] }]]),
    )
    expect([...readings.keys()]).toEqual([1])
  })
})

describe('readingsKey', () => {
  it('is stable for equal colours and changes when one moves', () => {
    const a = new Map([[1, { value: 1, colour: '#111111' }]])
    const b = new Map([[1, { value: 2, colour: '#111111' }]])
    const c = new Map([[1, { value: 2, colour: '#222222' }]])
    // The value moved but the colour did not, so markers need no re-render.
    expect(readingsKey(a)).toBe(readingsKey(b))
    expect(readingsKey(a)).not.toBe(readingsKey(c))
  })

  it('is empty for no readings', () => {
    expect(readingsKey(new Map())).toBe('')
  })
})
