'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { parseSensorSeries, type SensorSeries } from './sensorData'

import type { SensorDataFormat } from '../../../types/dbTypes'

const MIN_POLL_MS = 1000
/** Slower than a single card's own frequency: this hook exists to watch a whole set at once. */
const DEFAULT_POLL_MS = 15_000
/** Cap on sockets opened at once, so a type with 30 sensors does not fan out 30 requests. */
const MAX_CONCURRENT = 6

/** The minimum a sensor needs to expose for its series to be fetched. */
export interface MultiSeriesSensor {
  id: number
  url?: string | null
  dataFormat: SensorDataFormat | `${SensorDataFormat}`
}

export interface UseSensorSeriesMultiResult {
  /** Parsed series keyed by sensor id. Sensors that have never loaded are simply absent. */
  seriesById: Map<number, SensorSeries>
  isLoading: boolean
}

/** Runs `worker` over `items` with at most `limit` in flight at a time. */
async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++]
      await worker(item)
    }
  })
  await Promise.all(lanes)
}

/**
 * Fetch and poll the series for several sensors at once, parsed by the same
 * `parseSensorSeries` the single-sensor hook uses.
 *
 * Differences from `useSensorSeries`: one shared interval for the whole set rather than each
 * sensor's own `updateFrequency`, and a concurrency cap. A sensor whose fetch fails keeps its
 * last good series, and sensors dropped from `sensors` are evicted. Re-renders that pass an
 * equal-but-new array do not re-subscribe, since the effect keys on the set's identity string.
 *
 * The latest value for a sensor is `points[points.length - 1]?.value` - derive it at the call
 * site rather than reaching for a second hook.
 */
export function useSensorSeriesMulti(
  sensors: MultiSeriesSensor[],
  opts: { enabled: boolean; pollMs?: number },
): UseSensorSeriesMultiResult {
  const { enabled, pollMs } = opts
  const [seriesById, setSeriesById] = React.useState<Map<number, SensorSeries>>(() => new Map())
  const [isLoading, setIsLoading] = React.useState(false)

  // Only sensors with a URL can be fetched; the key is what the effect actually depends on.
  const targets = sensors.filter((s): s is MultiSeriesSensor & { url: string } => !!s.url)
  const targetsKey = targets.map(s => `${s.id}:${s.url}:${s.dataFormat}`).join('|')

  // Read through a ref so a new array identity with identical contents does not re-subscribe.
  const targetsRef = React.useRef(targets)
  targetsRef.current = targets

  React.useEffect(() => {
    if (!enabled || targetsKey === '') {
      setSeriesById(new Map())
      setIsLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const batch = targetsRef.current
    const liveIds = new Set(batch.map(s => s.id))

    const load = async (showLoading: boolean) => {
      if (showLoading) setIsLoading(true)
      const fetched = new Map<number, SensorSeries>()

      await runPool(batch, MAX_CONCURRENT, async (sensor) => {
        try {
          const res = await fetch(sensor.url, { signal: controller.signal })
          const text = await res.text()
          fetched.set(sensor.id, parseSensorSeries(text, sensor.dataFormat))
        } catch (err) {
          if (cancelled || controller.signal.aborted) return
          console.error('Error fetching sensor data:', err)
          // Leave this sensor out of `fetched` so the merge below keeps its last good series.
        }
      })

      if (cancelled) return

      setSeriesById(prev => {
        const merged = new Map<number, SensorSeries>()
        // Carry forward only sensors still in the set, then overlay this round's results.
        for (const [id, series] of prev) {
          if (liveIds.has(id)) merged.set(id, series)
        }
        for (const [id, series] of fetched) merged.set(id, series)
        return merged
      })

      if (showLoading) setIsLoading(false)
    }

    void load(true)
    const timer = setInterval(
      () => void load(false),
      Math.max(pollMs ?? DEFAULT_POLL_MS, MIN_POLL_MS),
    )

    return () => {
      cancelled = true
      controller.abort()
      clearInterval(timer)
    }
  }, [targetsKey, enabled, pollMs])

  return { seriesById, isLoading }
}

/** Latest observed value per sensor id, for halos and current-value comparisons. */
export function latestValues(seriesById: Map<number, SensorSeries>): Map<number, number> {
  const latest = new Map<number, number>()
  for (const [id, series] of seriesById) {
    const last = series.points[series.points.length - 1]
    if (last && Number.isFinite(last.value)) latest.set(id, last.value)
  }
  return latest
}
