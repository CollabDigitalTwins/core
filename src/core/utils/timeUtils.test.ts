// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { detectTimeZone, formatInZone, offsetZoneFromLongitude, resolveDefaultTimeZone } from './timeUtils'

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
