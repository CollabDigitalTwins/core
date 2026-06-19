// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect, vi, afterEach } from 'vitest'
import { isSameDay, timeAgo, formatTimestamp, formatDuration } from './timeUtils'

describe('formatDuration', () => {
  it('sub-second → ms', () => {
    expect(formatDuration(0)).toBe('0 ms')
    expect(formatDuration(500)).toBe('500 ms')
    expect(formatDuration(999)).toBe('999 ms')
  })
  it('seconds', () => {
    expect(formatDuration(1000)).toBe('1 sec')
    expect(formatDuration(30000)).toBe('30 sec')
  })
  it('minutes (floored)', () => {
    expect(formatDuration(60000)).toBe('1 min')
    expect(formatDuration(300000)).toBe('5 min')
  })
  it('hours (floored)', () => {
    expect(formatDuration(3600000)).toBe('1 hr')
    expect(formatDuration(2 * 3600000)).toBe('2 hr')
  })
  it('days (floored)', () => {
    expect(formatDuration(86400000)).toBe('1 day')
    expect(formatDuration(2 * 86400000)).toBe('2 days')
  })
})

describe('isSameDay', () => {
  it('true for the same calendar day at different times', () => {
    expect(isSameDay(new Date(2026, 0, 15, 1, 0), new Date(2026, 0, 15, 23, 59))).toBe(true)
  })
  it('false for different days/years', () => {
    expect(isSameDay(new Date(2026, 0, 15), new Date(2026, 0, 16))).toBe(false)
    expect(isSameDay(new Date(2026, 0, 15), new Date(2025, 0, 15))).toBe(false)
  })
})

describe('timeAgo (fixed clock)', () => {
  afterEach(() => vi.useRealTimers())
  it('renders compact relative strings', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0))
    expect(timeAgo(new Date(2026, 0, 15, 11, 59, 30))).toBe('30s')
    expect(timeAgo(new Date(2026, 0, 15, 11, 55, 0))).toBe('5 min')
    expect(timeAgo(new Date(2026, 0, 15, 9, 0, 0))).toBe('3h')
    expect(timeAgo(new Date(2026, 0, 13, 12, 0, 0))).toBe('2d')
  })
})

describe('formatTimestamp (fixed clock)', () => {
  afterEach(() => vi.useRealTimers())
  it('returns empty string for invalid input', () => {
    expect(formatTimestamp('not-a-date')).toBe('')
  })
  it('uses relative time for today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0))
    expect(formatTimestamp(new Date(2026, 0, 15, 11, 55, 0))).toBe('5 min')
  })
  it('uses a localized date string for other days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0))
    const out = formatTimestamp(new Date(2025, 5, 1, 12, 0, 0))
    expect(out).toContain('2025')
  })
})
