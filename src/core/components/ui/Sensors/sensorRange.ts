// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export type RangePreset = 'all' | 'day' | 'hour' | 'custom'

export interface RangeBounds {
  from: number
  to: number
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Bounds for a preset, computed from the latest point's time. `null` means "no filter" (all). */
export function rangeBounds(
  preset: RangePreset,
  points: { t: number }[],
  custom?: RangeBounds | null,
): RangeBounds | null {
  if (preset === 'custom') return custom ?? null
  if (preset === 'all' || points.length === 0) return null
  const to = points.reduce((m, p) => Math.max(m, p.t), points[0].t)
  const span = preset === 'hour' ? HOUR : DAY
  return { from: to - span, to }
}

/** Inclusive filter. `null` bounds returns the points unchanged. */
export function filterByRange<T extends { t: number }>(points: T[], bounds: RangeBounds | null): T[] {
  if (!bounds) return points
  return points.filter(p => p.t >= bounds.from && p.t <= bounds.to)
}

/**
 * Start/end indices into `points` (assumed ascending by `t`) for a recharts <Brush>.
 * `null` bounds spans the full series.
 */
export function indicesForBounds(
  points: { t: number }[],
  bounds: RangeBounds | null,
): { startIndex: number; endIndex: number } {
  if (points.length === 0) return { startIndex: 0, endIndex: 0 }
  if (!bounds) return { startIndex: 0, endIndex: points.length - 1 }
  let startIndex = points.findIndex(p => p.t >= bounds.from)
  if (startIndex < 0) startIndex = points.length - 1
  let endIndex = -1
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].t <= bounds.to) { endIndex = i; break }
  }
  if (endIndex < startIndex) endIndex = startIndex
  return { startIndex, endIndex }
}
