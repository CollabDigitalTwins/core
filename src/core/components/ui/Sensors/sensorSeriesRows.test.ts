// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { mergeSeriesRows, rowsValueDomain } from './sensorSeriesRows'

import type { SensorSeries } from './sensorData'

const series = (points: [number, number][]): SensorSeries => ({
  points: points.map(([t, value]) => ({ t, value })),
})

describe('mergeSeriesRows', () => {
  it('merges aligned timestamps into one row each', () => {
    const seriesById = new Map([
      [1, series([[100, 10], [200, 11]])],
      [2, series([[100, 20], [200, 21]])],
    ])
    expect(mergeSeriesRows(seriesById, [1, 2])).toEqual([
      { t: 100, '1': 10, '2': 20 },
      { t: 200, '1': 11, '2': 21 },
    ])
  })

  it('takes the union of unaligned timestamps and leaves gaps absent', () => {
    const seriesById = new Map([
      [1, series([[100, 10]])],
      [2, series([[150, 20]])],
    ])
    expect(mergeSeriesRows(seriesById, [1, 2])).toEqual([
      { t: 100, '1': 10 },
      { t: 150, '2': 20 },
    ])
  })

  it('sorts rows ascending by time regardless of input order', () => {
    const seriesById = new Map([[1, series([[300, 3], [100, 1], [200, 2]])]])
    expect(mergeSeriesRows(seriesById, [1]).map(r => r.t)).toEqual([100, 200, 300])
  })

  it('ignores ids with no series and non-finite values', () => {
    const seriesById = new Map([
      [1, series([[100, 10]])],
      [2, { points: [{ t: 100, value: Number.NaN }] }],
    ])
    expect(mergeSeriesRows(seriesById, [1, 2, 99])).toEqual([{ t: 100, '1': 10 }])
  })

  it('only includes the requested ids', () => {
    const seriesById = new Map([
      [1, series([[100, 10]])],
      [2, series([[100, 20]])],
    ])
    expect(mergeSeriesRows(seriesById, [1])).toEqual([{ t: 100, '1': 10 }])
  })

  it('returns no rows for an empty set', () => {
    expect(mergeSeriesRows(new Map(), [1])).toEqual([])
  })
})

describe('rowsValueDomain', () => {
  it('spans every value across the given sensors', () => {
    const rows = [
      { t: 1, '1': 5, '2': 30 },
      { t: 2, '1': 2, '2': 25 },
    ]
    expect(rowsValueDomain(rows, [1, 2])).toEqual({ min: 2, max: 30 })
  })

  it('ignores sensors not asked for', () => {
    const rows = [{ t: 1, '1': 5, '2': 300 }]
    expect(rowsValueDomain(rows, [1])).toEqual({ min: 5, max: 5 })
  })

  it('returns null when there is nothing to measure', () => {
    expect(rowsValueDomain([], [1])).toBeNull()
    expect(rowsValueDomain([{ t: 1 } as never], [1])).toBeNull()
  })
})
