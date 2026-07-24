// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { SensorDataFormat } from '../../../types/dbTypes'

import { parseSensorSeries } from './sensorData'

describe('parseSensorSeries', () => {
  it('parses header-less CSV time,value and drops NaN rows', () => {
    const raw = '0:00:00,7.4\n1:00:00,8.1\nbad,notnum\n'
    const { points } = parseSensorSeries(raw, SensorDataFormat.Csv)
    expect(points).toEqual([
      { time: '0:00:00', value: 7.4 },
      { time: '1:00:00', value: 8.1 },
    ])
  })

  it('parses an STA Datastream: unit symbol, ISO->UTC clock, numeric result', () => {
    const raw = JSON.stringify({
      unitOfMeasurement: { name: 'degree Celsius', symbol: '°C', definition: 'http://x' },
      observationType: 'http://.../OM_Measurement',
      Observations: [
        { phenomenonTime: '2026-07-23T14:30:00Z', result: 21.5 },
        { phenomenonTime: '2026-07-23T15:00:05Z', result: 22 },
      ],
    })
    const { points, unit } = parseSensorSeries(raw, SensorDataFormat.Json)
    expect(unit).toBe('°C')
    expect(points).toEqual([
      { time: '14:30:00', value: 21.5 },
      { time: '15:00:05', value: 22 },
    ])
  })

  it('parses the compact dataArray form', () => {
    const raw = JSON.stringify({
      components: ['phenomenonTime', 'result'],
      'dataArray@iot.count': 2,
      dataArray: [
        ['2026-07-23T00:00:00Z', 3],
        ['2026-07-23T00:05:00Z', 4],
      ],
    })
    const { points } = parseSensorSeries(raw, SensorDataFormat.Json)
    expect(points).toEqual([
      { time: '0:00:00', value: 3 },
      { time: '0:05:00', value: 4 },
    ])
  })

  it('parses a single reading from the ?format=reading shape ({ type, unit, timestamp, value })', () => {
    // Real shape from GET /api/sensor/temperature?format=reading (inspected 2026-07-24).
    const raw = JSON.stringify({
      type: 'temperature', unit: '°C', seed: 0,
      timestamp: '2026-07-24T10:55:17.465Z', value: 26.61, min: 15, max: 30,
    })
    const { points, unit } = parseSensorSeries(raw, SensorDataFormat.Json)
    expect(unit).toBe('°C')
    expect(points).toEqual([{ time: '10:55:17', value: 26.61 }])
  })

  it('coerces boolean results to 0/1', () => {
    const raw = JSON.stringify({
      Observations: [
        { phenomenonTime: '2026-07-23T00:00:00Z', result: true },
        { phenomenonTime: '2026-07-23T00:00:01Z', result: false },
      ],
    })
    const { points } = parseSensorSeries(raw, SensorDataFormat.Json)
    expect(points.map(p => p.value)).toEqual([1, 0])
  })

  it('maps category string results to first-seen ordinals with labels', () => {
    const raw = JSON.stringify({
      Observations: [
        { phenomenonTime: '2026-07-23T00:00:00Z', result: 'idle' },
        { phenomenonTime: '2026-07-23T00:00:01Z', result: 'active' },
        { phenomenonTime: '2026-07-23T00:00:02Z', result: 'idle' },
      ],
    })
    const { points, valueLabels } = parseSensorSeries(raw, SensorDataFormat.Json)
    expect(points.map(p => p.value)).toEqual([0, 1, 0])
    expect(valueLabels).toEqual({ 0: 'idle', 1: 'active' })
  })

  it('returns empty points for malformed JSON without throwing', () => {
    expect(parseSensorSeries('{not json', SensorDataFormat.Json)).toEqual({ points: [] })
  })
})
