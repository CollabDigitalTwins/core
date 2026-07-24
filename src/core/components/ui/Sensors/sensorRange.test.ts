// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { filterByRange, indicesForBounds, rangeBounds } from './sensorRange'

const HOUR = 3_600_000
// t0..t4 spaced 30 min apart, ending at t4 = "latest".
const t4 = Date.parse('2026-07-23T14:00:00Z')
const points = [4, 3, 2, 1, 0].map(back => ({ t: t4 - back * 30 * 60_000, value: back }))

describe('rangeBounds', () => {
  it('returns null for "all"', () => {
    expect(rangeBounds('all', points)).toBeNull()
  })
  it('returns a 1h window ending at the latest point for "hour"', () => {
    expect(rangeBounds('hour', points)).toEqual({ from: t4 - HOUR, to: t4 })
  })
  it('returns a 24h window for "day"', () => {
    expect(rangeBounds('day', points)).toEqual({ from: t4 - 24 * HOUR, to: t4 })
  })
  it('returns the supplied custom bounds for "custom"', () => {
    const custom = { from: 10, to: 20 }
    expect(rangeBounds('custom', points, custom)).toBe(custom)
  })
  it('returns null when there are no points', () => {
    expect(rangeBounds('hour', [])).toBeNull()
  })
  it('returns null for "custom" when custom arg is omitted', () => {
    expect(rangeBounds('custom', points)).toBeNull()
  })
})

describe('filterByRange', () => {
  it('returns all points when bounds is null', () => {
    expect(filterByRange(points, null)).toHaveLength(5)
  })
  it('keeps only points inside inclusive bounds', () => {
    const kept = filterByRange(points, { from: t4 - HOUR, to: t4 })
    expect(kept.map(p => p.value)).toEqual([2, 1, 0]) // last 3 points are within 1h
  })
})

describe('indicesForBounds', () => {
  it('spans the whole series for null bounds', () => {
    expect(indicesForBounds(points, null)).toEqual({ startIndex: 0, endIndex: 4 })
  })
  it('finds start/end indices for a window', () => {
    expect(indicesForBounds(points, { from: t4 - HOUR, to: t4 })).toEqual({ startIndex: 2, endIndex: 4 })
  })
  it('returns a minimal range at the start when window is entirely before data', () => {
    const beforeAllPoints = [100, 200, 300].map(t => ({ t, value: t }))
    expect(indicesForBounds(beforeAllPoints, { from: -100, to: -50 })).toEqual({ startIndex: 0, endIndex: 0 })
  })
})
