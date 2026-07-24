// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Check if two dates are on the same day (ignoring time)
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  )
}

/**
 * Calculate time elapsed since a given date and return a human-readable string
 * Examples: "5s", "10 min", "3h", "2d", "1w", "3mo", "2y"
 */
export function timeAgo(then: Date): string {
  const now = new Date()
  const diffSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffSeconds < 60) return `${diffSeconds}s`

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `${diffWeeks}w`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo`

  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears}y`
}

/**
 * Format a timestamp for display
 * - If today: shows relative time (e.g., "5 min")
 * - If not today: shows formatted date (e.g., "Jan 15, 2026")
 *
 * The `timeZone` arg only affects the absolute-date rendering; the today/relative
 * boundary is computed in the host local day (a known cosmetic limitation near
 * midnight across zones).
 */
export function formatTimestamp(input: string | Date, timeZone?: string): string {
  const then = typeof input === 'string' ? new Date(input) : input
  const now = new Date()

  if (Number.isNaN(then.getTime())) return ''
  if (isSameDay(now, then)) return timeAgo(then)

  return then.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  })
}

/**
 * Format milliseconds to human-readable duration
 * Examples: "500 ms", "1 sec", "30 sec", "5 min", "1 hr", "2 days"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`

  const seconds = ms / 1000
  if (seconds < 60) return seconds === 1 ? '1 sec' : `${seconds} sec`

  const minutes = seconds / 60
  if (minutes < 60) return minutes === 1 ? '1 min' : `${Math.floor(minutes)} min`

  const hours = minutes / 60
  if (hours < 24) return hours === 1 ? '1 hr' : `${Math.floor(hours)} hr`

  const days = hours / 24
  return days === 1 ? '1 day' : `${Math.floor(days)} days`
}

/**
 * Time frequency units for duration inputs
 * Value is the multiplier to convert to milliseconds
 */
export const frequencyUnits = [
  { value: 1, label: 'Milliseconds' },
  { value: 1000, label: 'Seconds' },
  { value: 60000, label: 'Minutes' },
  { value: 3600000, label: 'Hours' },
] as const

/** Browser IANA zone, e.g. "America/Toronto". Falls back to "UTC" if unavailable. */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * Longitude -> nearest whole-hour offset -> an Etc/GMT±N id. Note POSIX sign inversion:
 * a positive (east) offset is Etc/GMT-N. This is a rough approximation: no DST, no
 * political borders. 0 -> "UTC".
 */
export function offsetZoneFromLongitude(longitude: number): string {
  if (!Number.isFinite(longitude)) return 'UTC'
  let h = Math.round(longitude / 15)
  h = Math.max(-12, Math.min(12, h))
  if (h === 0) return 'UTC'
  return `Etc/GMT${h > 0 ? '-' : '+'}${Math.abs(h)}`
}

/**
 * Default display zone. Prefers the browser's IANA zone: it is DST-correct and, for a user
 * in the sensor's region, already the right local zone. Only when detection is unavailable
 * (returns "UTC") does it fall back to a longitude-derived fixed offset, trying each
 * candidate longitude in order. Callers pass candidates in priority order: BIM sensors sit
 * in a building (building longitude first), map sensors carry their own coordinates (sensor
 * longitude first).
 */
export function resolveDefaultTimeZone(longitudeCandidates: Array<number | null | undefined>): string {
  const detected = detectTimeZone()
  if (detected && detected !== 'UTC') return detected
  for (const lng of longitudeCandidates) {
    if (typeof lng === 'number' && Number.isFinite(lng)) return offsetZoneFromLongitude(lng)
  }
  return detected || 'UTC'
}

/** Format an epoch in a specific zone. Handles Etc/GMT±N and true IANA zones alike. */
export function formatInZone(
  epochMs: number,
  timeZone: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone, ...opts }).format(epochMs)
  } catch {
    return new Intl.DateTimeFormat(undefined, opts).format(epochMs)
  }
}
