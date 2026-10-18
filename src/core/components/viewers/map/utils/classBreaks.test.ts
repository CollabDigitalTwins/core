// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { classBreaks } from './classBreaks'

describe('classBreaks', () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it('splits the range evenly for equal interval', () => {
    expect(classBreaks(values, 3, 'equalInterval')).toEqual([4, 7])
  })

  it('splits by count for quantile', () => {
    expect(classBreaks([...values, 100, 200], 4, 'quantile')).toEqual([4, 7, 10])
  })

  it('separates natural clusters with jenks', () => {
    expect(classBreaks([1, 2, 3, 50, 51, 52, 100, 101, 102], 3, 'jenks')).toEqual([50, 100])
  })

  it('returns no breaks for constant or too little data', () => {
    expect(classBreaks([5, 5, 5], 3, 'quantile')).toEqual([])
    expect(classBreaks([5], 3, 'jenks')).toEqual([])
  })
})
