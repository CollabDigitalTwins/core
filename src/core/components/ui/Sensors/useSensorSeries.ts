'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { parseSensorSeries, type SensorSeries } from './sensorData'

import type { SensorDataFormat } from '../../../types/dbTypes'

const MIN_POLL_MS = 1000

export interface UseSensorSeriesResult extends SensorSeries {
  isLoading: boolean
}

/**
 * Fetch `dataUrl`, parse it (CSV or OGC JSON via parseSensorSeries), and re-fetch on
 * `updateFrequencyMs` (floored at 1s) while `enabled`. Each tick replaces the series (the
 * synthetic API serves a rolling window ending "now"). Aborts in-flight fetches and clears
 * the interval on disable/unmount/param change; a failed poll keeps the last good series.
 */
export function useSensorSeries(
  dataUrl: string,
  dataFormat: SensorDataFormat | `${SensorDataFormat}`,
  updateFrequencyMs: number,
  opts: { enabled: boolean },
): UseSensorSeriesResult {
  const { enabled } = opts
  const [series, setSeries] = React.useState<SensorSeries>({ points: [] })
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!enabled || !dataUrl) {
      setSeries({ points: [] })
      setIsLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const load = async (showLoading: boolean) => {
      if (showLoading) setIsLoading(true)
      try {
        const res = await fetch(dataUrl, { signal: controller.signal })
        const text = await res.text()
        if (cancelled) return
        setSeries(parseSensorSeries(text, dataFormat))
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        console.error('Error fetching sensor data:', err)
        // keep last good series
      } finally {
        if (!cancelled && showLoading) setIsLoading(false)
      }
    }

    void load(true)
    const timer = setInterval(() => void load(false), Math.max(updateFrequencyMs || 0, MIN_POLL_MS))

    return () => {
      cancelled = true
      controller.abort()
      clearInterval(timer)
    }
  }, [dataUrl, dataFormat, updateFrequencyMs, enabled])

  return { ...series, isLoading }
}
