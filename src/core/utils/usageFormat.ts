// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export function numberFormatter(locale: string, maximumFractionDigits = 1) {
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits, minimumFractionDigits: 0 })
  return (value: number) => format.format(value)
}

/** GB with one decimal, three below 0.1 GB, and TB from 1024 GB up. */
export function gbFormatter(locale: string) {
  const tb = numberFormatter(locale, 2)
  const gb = numberFormatter(locale, 1)
  const small = numberFormatter(locale, 3)
  return (value: number) => {
    if (value >= 1024) return `${tb(value / 1024)} TB`
    return value > 0 && value < 0.1 ? `${small(value)} GB` : `${gb(value)} GB`
  }
}

export function relativeTime(locale: string, iso: string | null, now = Date.now()): string | null {
  if (!iso) return null
  const seconds = Math.round((Date.parse(iso) - now) / 1000)
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const abs = Math.abs(seconds)
  if (abs < 60) return format.format(seconds, 'second')
  if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute')
  if (abs < 86_400) return format.format(Math.round(seconds / 3600), 'hour')
  return format.format(Math.round(seconds / 86_400), 'day')
}

export function monthLabel(locale: string, month: string): string {
  const [year, monthIndex] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, monthIndex - 1, 1)))
}
