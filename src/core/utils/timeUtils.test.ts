// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  detectTimeZone,
  formatDuration,
  formatInZone,
  formatTimestamp,
  isSameDay,
  offsetZoneFromLongitude,
  resolveDefaultTimeZone,
  timeAgo,
} from './timeUtils'

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
  it('honors a passed IANA time zone on the date branch (not the relative branch)', () => {
    vi.useFakeTimers()
    // "now" is months away from `then`, so isSameDay is false regardless of host offset
    // and this exercises the absolute-date formatting path, not the relative one.
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0))
    const then = new Date(Date.UTC(2025, 5, 1, 23, 0, 0)) // 2025-06-01T23:00:00Z

    const inUtc = formatTimestamp(then, 'UTC')
    // Pacific/Kiritimati is UTC+14: 23:00Z + 14h rolls over to the next calendar day.
    const inKiritimati = formatTimestamp(then, 'Pacific/Kiritimati')

    expect(inUtc).toContain('2025')
    expect(inKiritimati).toContain('2025')
    expect(inUtc).not.toBe(inKiritimati)
    expect(inUtc).toContain('01')
    expect(inKiritimati).toContain('02')
  })
})

describe('offsetZoneFromLongitude', () => {
  it('maps a western longitude to Etc/GMT+N (POSIX sign inversion)', () => {
    expect(offsetZoneFromLongitude(-79)).toBe('Etc/GMT+5') // Toronto ~ UTC-5
  })
  it('maps an eastern longitude to Etc/GMT-N', () => {
    expect(offsetZoneFromLongitude(139)).toBe('Etc/GMT-9') // Tokyo ~ UTC+9
  })
  it('maps ~0 longitude to UTC', () => {
    expect(offsetZoneFromLongitude(3)).toBe('UTC')
  })
  it('falls back to UTC for non-finite input', () => {
    expect(offsetZoneFromLongitude(NaN)).toBe('UTC')
  })
})

describe('resolveDefaultTimeZone', () => {
  it('prefers building longitude', () => {
    expect(resolveDefaultTimeZone({ buildingLongitude: -79, sensorLongitude: 139 })).toBe('Etc/GMT+5')
  })
  it('falls back to sensor longitude', () => {
    expect(resolveDefaultTimeZone({ buildingLongitude: null, sensorLongitude: 139 })).toBe('Etc/GMT-9')
  })
  it('falls back to the detected browser zone', () => {
    const z = resolveDefaultTimeZone({ buildingLongitude: null, sensorLongitude: null })
    expect(typeof z).toBe('string')
    expect(z.length).toBeGreaterThan(0)
  })
})

describe('formatInZone', () => {
  const epoch = Date.parse('2026-01-01T00:00:00Z')
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
  it('formats midnight UTC as 00:00', () => {
    expect(formatInZone(epoch, 'UTC', opts)).toBe('00:00')
  })
  it('shifts back 5h in Etc/GMT+5', () => {
    expect(formatInZone(epoch, 'Etc/GMT+5', opts)).toBe('19:00')
  })
})

describe('detectTimeZone', () => {
  it('returns a non-empty IANA string', () => {
    expect(detectTimeZone().length).toBeGreaterThan(0)
  })
})
