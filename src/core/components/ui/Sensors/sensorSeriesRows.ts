// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { SensorSeries } from './sensorData'

/** One row per timestamp: `t` plus a value per sensor id that reported at that instant. */
export interface SeriesRow {
  t: number
  [sensorId: string]: number
}

/**
 * Merges per-sensor series into the single row array a recharts multi-line chart needs.
 *
 * Sensors poll independently, so their timestamps rarely line up: the rows are the union of
 * every timestamp, and a sensor that has no reading at one is simply absent from that row.
 * Lines are drawn with `connectNulls` so those gaps do not break a series in two.
 *
 * Keys are the sensor ids as strings, which is what `Line dataKey` needs.
 */
export function mergeSeriesRows(
  seriesById: Map<number, SensorSeries>,
  ids: number[],
): SeriesRow[] {
  const byTime = new Map<number, SeriesRow>()

  for (const id of ids) {
    const series = seriesById.get(id)
    if (!series) continue
    for (const point of series.points) {
      if (!Number.isFinite(point.value)) continue
      const row = byTime.get(point.t) ?? ({ t: point.t } as SeriesRow)
      row[String(id)] = point.value
      byTime.set(point.t, row)
    }
  }

  return [...byTime.values()].sort((a, b) => a.t - b.t)
}

/** Domain covering every value across the given sensors, for a shared y-axis. */
export function rowsValueDomain(rows: SeriesRow[], ids: number[]): { min: number; max: number } | null {
  let min = Infinity
  let max = -Infinity
  for (const row of rows) {
    for (const id of ids) {
      const value = row[String(id)]
      if (typeof value !== 'number') continue
      if (value < min) min = value
      if (value > max) max = value
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  return { min, max }
}
