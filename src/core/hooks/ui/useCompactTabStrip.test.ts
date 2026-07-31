// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { MIN_TAB_LABEL_WIDTH, isCompactWidth } from './useCompactTabStrip'

describe('isCompactWidth', () => {
  it('keeps labels when every tab clears the minimum', () => {
    // 5 tabs at 400px = 80px each.
    expect(isCompactWidth(400, 5)).toBe(false)
  })

  it('drops labels when the strip is too narrow to share', () => {
    // The screenshot case: a ~290px sidebar with 5 tabs, ~58px each.
    expect(isCompactWidth(290, 5)).toBe(true)
  })

  it('drops labels at the same width once more tabs are added', () => {
    // 300px / 4 = 75px fits; 300px / 5 = 60px does not.
    expect(isCompactWidth(300, 4)).toBe(false)
    expect(isCompactWidth(300, 5)).toBe(true)
  })

  it('treats exactly the minimum per tab as too tight', () => {
    expect(isCompactWidth(MIN_TAB_LABEL_WIDTH * 5, 5)).toBe(false)
    expect(isCompactWidth(MIN_TAB_LABEL_WIDTH * 5 - 1, 5)).toBe(true)
  })

  it('honours a custom minimum item width', () => {
    expect(isCompactWidth(300, 5, 40)).toBe(false)
    expect(isCompactWidth(300, 5, 80)).toBe(true)
  })

  it('falls back to compact for unmeasured or invalid widths', () => {
    // Icon-only is never visually broken; a truncated label is.
    expect(isCompactWidth(0, 5)).toBe(true)
    expect(isCompactWidth(-10, 5)).toBe(true)
    expect(isCompactWidth(Number.NaN, 5)).toBe(true)
    expect(isCompactWidth(Number.POSITIVE_INFINITY, 5)).toBe(true)
  })

  it('falls back to compact when there are no tabs to measure', () => {
    expect(isCompactWidth(400, 0)).toBe(true)
  })
})
