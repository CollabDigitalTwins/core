// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { gbFormatter, monthLabel, relativeTime } from './usageFormat'

describe('usageFormat', () => {
  it('switches units and precision by size', () => {
    const gb = gbFormatter('en')
    expect(gb(0)).toBe('0 GB')
    expect(gb(0.05)).toBe('0.05 GB')
    expect(gb(12.34)).toBe('12.3 GB')
    expect(gb(2048)).toBe('2 TB')
  })

  it('labels a month in UTC', () => {
    expect(monthLabel('en', '2026-01')).toBe('January 2026')
  })

  it('is null without a timestamp and relative otherwise', () => {
    expect(relativeTime('en', null)).toBeNull()
    expect(relativeTime('en', '2026-11-01T00:00:00Z', Date.parse('2026-11-03T00:00:00Z'))).toBe('2 days ago')
  })
})
