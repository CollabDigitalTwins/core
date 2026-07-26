// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import {
  colourForValue,
  domainTicks,
  gradientStopsForYDomain,
  lerpHex,
  observedDomain,
  rampStops,
  resolveDomain,
  resolveRamp,
  valueOffset,
  type ColourRamp,
} from './sensorColour'

import type { SensorType } from '../../../types/dbTypes'

// Pure black/grey/white ramp so interpolation results are readable by eye.
const ramp: ColourRamp = { min: '#000000', mid: '#808080', max: '#ffffff' }
const domain = { min: 0, max: 100 }

const sensorType = (over: Partial<SensorType> = {}): SensorType => ({
  id: 1,
  name: 'Temperature',
  icon: 'Thermometer',
  minValue: 0,
  maxValue: 100,
  minColour: '#111111',
  midColour: '#222222',
  maxColour: '#333333',
  ...over,
})

describe('lerpHex', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    expect(lerpHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(lerpHex('#000000', '#ffffff', 1)).toBe('#ffffff')
  })

  it('interpolates the midpoint', () => {
    expect(lerpHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('expands 3-digit hex', () => {
    expect(lerpHex('#000', '#fff', 1)).toBe('#ffffff')
  })

  it('clamps t outside 0..1', () => {
    expect(lerpHex('#000000', '#ffffff', -2)).toBe('#000000')
    expect(lerpHex('#000000', '#ffffff', 9)).toBe('#ffffff')
  })

  it('falls back to the parseable endpoint when one is malformed', () => {
    expect(lerpHex('not-a-colour', '#ffffff', 0.5)).toBe('#ffffff')
    expect(lerpHex('#000000', 'rgb(1,2,3)', 0.5)).toBe('#000000')
  })
})

describe('colourForValue', () => {
  it('returns the ramp endpoints at the domain bounds', () => {
    expect(colourForValue(0, ramp, domain)).toBe('#000000')
    expect(colourForValue(100, ramp, domain)).toBe('#ffffff')
  })

  it('returns the mid colour at the domain midpoint', () => {
    expect(colourForValue(50, ramp, domain)).toBe('#808080')
  })

  it('interpolates within each half independently', () => {
    // 25 is halfway between min and mid, so halfway between #000000 and #808080.
    expect(colourForValue(25, ramp, domain)).toBe('#404040')
    // 75 is halfway between mid and max.
    expect(colourForValue(75, ramp, domain)).toBe('#c0c0c0')
  })

  it('clamps values outside the domain to the endpoint colours', () => {
    expect(colourForValue(-500, ramp, domain)).toBe('#000000')
    expect(colourForValue(500, ramp, domain)).toBe('#ffffff')
  })

  it('returns the mid colour for a zero-width domain or a non-finite value', () => {
    expect(colourForValue(5, ramp, { min: 5, max: 5 })).toBe('#808080')
    expect(colourForValue(Number.NaN, ramp, domain)).toBe('#808080')
  })

  it('handles a negative domain', () => {
    expect(colourForValue(-40, ramp, { min: -40, max: 40 })).toBe('#000000')
    expect(colourForValue(0, ramp, { min: -40, max: 40 })).toBe('#808080')
  })
})

describe('resolveRamp', () => {
  it('prefers the DB colours on the type row', () => {
    expect(resolveRamp(sensorType())).toEqual({ min: '#111111', mid: '#222222', max: '#333333' })
  })

  it('lets explicit overrides win over the DB colours', () => {
    const resolved = resolveRamp(sensorType(), { max: '#abcdef' })
    expect(resolved.max).toBe('#abcdef')
    expect(resolved.min).toBe('#111111')
  })

  it('falls back to the per-type palette when the row has no colours', () => {
    const bare = sensorType({ minColour: '', midColour: '', maxColour: '' })
    // Temperature's documented ramp is blue -> near-white -> red.
    expect(resolveRamp(bare)).toEqual({ min: '#3B82F6', mid: '#F8FAFC', max: '#EF4444' })
  })

  it('falls back to the global palette when there is no type at all', () => {
    expect(resolveRamp(undefined)).toEqual({ min: '#16A34A', mid: '#FACC15', max: '#B91C1C' })
  })
})

describe('observedDomain', () => {
  it('returns the min and max of the points', () => {
    expect(observedDomain([{ value: 7 }, { value: 2 }, { value: 9 }])).toEqual({ min: 2, max: 9 })
  })

  it('returns null for no points', () => {
    expect(observedDomain([])).toBeNull()
  })

  it('ignores non-finite values', () => {
    expect(observedDomain([{ value: Number.NaN }, { value: 4 }])).toEqual({ min: 4, max: 4 })
    expect(observedDomain([{ value: Number.NaN }])).toBeNull()
  })
})

describe('resolveDomain', () => {
  it('uses the type range when it has width', () => {
    expect(resolveDomain(sensorType({ minValue: -10, maxValue: 40 }))).toEqual({ min: -10, max: 40 })
  })

  it('prefers the type range over the observed range', () => {
    expect(resolveDomain(sensorType(), { min: 20, max: 22 })).toEqual({ min: 0, max: 100 })
  })

  it('falls back to the observed range when the type range is degenerate', () => {
    expect(resolveDomain(sensorType({ minValue: 0, maxValue: 0 }), { min: 20, max: 22 }))
      .toEqual({ min: 20, max: 22 })
  })

  it('falls back to the observed range when the type range is inverted', () => {
    expect(resolveDomain(sensorType({ minValue: 90, maxValue: 10 }), { min: 1, max: 2 }))
      .toEqual({ min: 1, max: 2 })
  })

  it('returns null when nothing yields a usable range', () => {
    expect(resolveDomain(sensorType({ minValue: 0, maxValue: 0 }), null)).toBeNull()
    expect(resolveDomain(undefined, undefined)).toBeNull()
    // A constant series has no width either.
    expect(resolveDomain(undefined, { min: 5, max: 5 })).toBeNull()
  })
})

describe('valueOffset', () => {
  it('maps the domain onto 0..1', () => {
    expect(valueOffset(0, domain)).toBe(0)
    expect(valueOffset(50, domain)).toBe(0.5)
    expect(valueOffset(100, domain)).toBe(1)
  })

  it('clamps out-of-domain values', () => {
    expect(valueOffset(-10, domain)).toBe(0)
    expect(valueOffset(200, domain)).toBe(1)
  })

  it('returns 0 for a zero-width domain', () => {
    expect(valueOffset(5, { min: 5, max: 5 })).toBe(0)
  })
})

describe('domainTicks and rampStops', () => {
  it('reports low, middle and high in ascending order', () => {
    expect(domainTicks({ min: -10, max: 30 })).toEqual([-10, 10, 30])
  })

  it('lays the legend ramp out left to right', () => {
    expect(rampStops(ramp)).toEqual([
      { offset: 0, colour: '#000000' },
      { offset: 0.5, colour: '#808080' },
      { offset: 1, colour: '#ffffff' },
    ])
  })
})

describe('gradientStopsForYDomain', () => {
  it('puts the highest visible value at offset 0', () => {
    const stops = gradientStopsForYDomain(ramp, domain, { min: 0, max: 100 })
    expect(stops[0]).toEqual({ offset: 0, colour: '#ffffff' })
    expect(stops[stops.length - 1]).toEqual({ offset: 1, colour: '#000000' })
  })

  it('keeps offsets inside 0..1 and sorted when the plot box is narrower than the domain', () => {
    const stops = gradientStopsForYDomain(ramp, domain, { min: 20, max: 22 })
    expect(stops.every(s => s.offset >= 0 && s.offset <= 1)).toBe(true)
    expect(stops.map(s => s.offset)).toEqual([...stops.map(s => s.offset)].sort((a, b) => a - b))
  })

  it('keeps offsets inside 0..1 and sorted when the plot box is wider than the domain', () => {
    const stops = gradientStopsForYDomain(ramp, domain, { min: -200, max: 300 })
    expect(stops.every(s => s.offset >= 0 && s.offset <= 1)).toBe(true)
    expect(stops.map(s => s.offset)).toEqual([...stops.map(s => s.offset)].sort((a, b) => a - b))
  })

  it('places an interior breakpoint where the value actually sits in the box', () => {
    // Domain 0..100 over a box of 0..200: the ramp's mid (50) sits three quarters down.
    const stops = gradientStopsForYDomain(ramp, domain, { min: 0, max: 200 })
    const mid = stops.find(s => s.colour === '#808080')
    expect(mid?.offset).toBeCloseTo(0.75)
  })

  it('reproduces colourForValue at the stops it emits', () => {
    const yDomain = { min: 10, max: 90 }
    const stops = gradientStopsForYDomain(ramp, domain, yDomain)
    for (const stop of stops) {
      const value = yDomain.max - stop.offset * (yDomain.max - yDomain.min)
      expect(stop.colour).toBe(colourForValue(value, ramp, domain))
    }
  })

  it('collapses to a single colour for a flat series', () => {
    const stops = gradientStopsForYDomain(ramp, domain, { min: 50, max: 50 })
    expect(stops).toEqual([
      { offset: 0, colour: '#808080' },
      { offset: 1, colour: '#808080' },
    ])
  })

  it('clamps the whole fill when the box sits entirely above the domain', () => {
    const stops = gradientStopsForYDomain(ramp, domain, { min: 300, max: 400 })
    expect(stops.every(s => s.colour === '#ffffff')).toBe(true)
  })
})
