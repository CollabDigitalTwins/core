// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { SensorDataFormat } from '../../../types/dbTypes'

import { parseSensorSeries } from './sensorData'

/** UTC clock "H:MM:SS" of an epoch, for asserting the time survived the ISO->epoch trip. */
function utcClock(t: number): string {
  const d = new Date(t)
  return `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}`
}

describe('parseSensorSeries', () => {
  it('parses header-less CSV time,value into epoch points and drops NaN rows', () => {
    const raw = '0:00:00,7.4\n1:00:00,8.1\nbad,notnum\n'
    const { points } = parseSensorSeries(raw, SensorDataFormat.Csv)
    expect(points.map(p => p.value)).toEqual([7.4, 8.1])
    // bare clock -> today's UTC date; assert the clock component survived
    expect(utcClock(points[0].t)).toBe('0:00:00')
    expect(utcClock(points[1].t)).toBe('1:00:00')
    expect(typeof points[0].t).toBe('number')
  })

  it('parses CSV with ISO timestamps to exact epochs', () => {
    const raw = '2026-07-23T14:30:00Z,21.5\n'
    const { points } = parseSensorSeries(raw, SensorDataFormat.Csv)
    expect(points).toEqual([{ t: Date.parse('2026-07-23T14:30:00Z'), value: 21.5 }])
  })

  it('parses an STA Datastream: unit symbol, ISO->epoch, numeric result, and meta', () => {
    const raw = JSON.stringify({
      '@iot.selfLink': 'https://h/api/sensor/temperature?format=sta',
      name: 'Air Temperature',
      description: 'Synthetic',
      observationType: 'http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement',
      unitOfMeasurement: { name: 'degree Celsius', symbol: '°C', definition: 'https://qudt.org/vocab/unit/DEG_C' },
      phenomenonTime: '2026-07-23T14:30:00Z/2026-07-23T15:00:05Z',
      properties: { seed: 0, frequency: 300000, generator: 'sensors-api' },
      Sensor: { name: 'Synthetic temperature sensor', metadata: 'https://github.com/nicoarellano/sensors-api' },
      ObservedProperty: { name: 'Air Temperature', definition: 'https://dbpedia.org/page/Temperature' },
      'Observations@iot.count': 2,
      Observations: [
        { phenomenonTime: '2026-07-23T14:30:00Z', result: 21.5 },
        { phenomenonTime: '2026-07-23T15:00:05Z', result: 22 },
      ],
    })
    const { points, unit, meta } = parseSensorSeries(raw, SensorDataFormat.Json)
    expect(unit).toBe('°C')
    expect(points).toEqual([
      { t: Date.parse('2026-07-23T14:30:00Z'), value: 21.5 },
      { t: Date.parse('2026-07-23T15:00:05Z'), value: 22 },
    ])
    expect(meta?.name).toBe('Air Temperature')
    expect(meta?.unit).toEqual({ name: 'degree Celsius', symbol: '°C', definition: 'https://qudt.org/vocab/unit/DEG_C' })
    expect(meta?.observationType).toBe('OM_Measurement')
    expect(meta?.observedProperty?.definition).toBe('https://dbpedia.org/page/Temperature')
    expect(meta?.observationCount).toBe(2)
    expect(meta?.properties).toEqual({ seed: 0, frequency: 300000, generator: 'sensors-api' })
    expect(meta?.selfLink).toBe('https://h/api/sensor/temperature?format=sta')
    expect(meta?.sensor?.metadata).toBe('https://github.com/nicoarellano/sensors-api')
  })

  it('parses the compact dataArray form with no meta', () => {
    const raw = JSON.stringify({
      components: ['phenomenonTime', 'result'],
      'dataArray@iot.count': 2,
      dataArray: [['2026-07-23T00:00:00Z', 3], ['2026-07-23T00:05:00Z', 4]],
    })
    const { points, meta } = parseSensorSeries(raw, SensorDataFormat.Json)
    expect(points).toEqual([
      { t: Date.parse('2026-07-23T00:00:00Z'), value: 3 },
      { t: Date.parse('2026-07-23T00:05:00Z'), value: 4 },
    ])
    expect(meta).toBeUndefined()
  })

  it('parses a single reading ({ type, unit, timestamp, value })', () => {
    const raw = JSON.stringify({
      type: 'temperature', unit: '°C', seed: 0,
      timestamp: '2026-07-24T10:55:17.465Z', value: 26.61, min: 15, max: 30,
    })
    const { points, unit } = parseSensorSeries(raw, SensorDataFormat.Json)
    expect(unit).toBe('°C')
    expect(points).toEqual([{ t: Date.parse('2026-07-24T10:55:17.465Z'), value: 26.61 }])
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
