// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SensorDataFormat } from '../../../types/dbTypes'

import { useSensorSeries } from './useSensorSeries'

const realFetch = global.fetch

function mockCsv(value: number) {
  return { text: async () => `0:00:00,${value}` } as unknown as Response
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  global.fetch = realFetch
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useSensorSeries', () => {
  it('fetches once when enabled and returns parsed points', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockCsv(7)) as any
    const { result } = renderHook(() =>
      useSensorSeries('http://x/api/sensor/temperature', SensorDataFormat.Csv, 60000, { enabled: true }),
    )
    await waitFor(() => expect(result.current.points).toEqual([{ time: '0:00:00', value: 7 }]))
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('does not fetch when disabled', () => {
    global.fetch = vi.fn() as any
    renderHook(() =>
      useSensorSeries('http://x', SensorDataFormat.Csv, 60000, { enabled: false }),
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('re-fetches on the poll interval and replaces the series', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValueOnce(mockCsv(1)).mockResolvedValueOnce(mockCsv(2))
    global.fetch = fetchMock as any
    const { result } = renderHook(() =>
      useSensorSeries('http://x', SensorDataFormat.Csv, 1000, { enabled: true }),
    )
    await act(async () => { await Promise.resolve() })
    expect(result.current.points[0].value).toBe(1)
    await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve() })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current.points[0].value).toBe(2)
  })

  it('clears the interval on unmount (no fetch after unmount)', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(mockCsv(1))
    global.fetch = fetchMock as any
    const { unmount } = renderHook(() =>
      useSensorSeries('http://x', SensorDataFormat.Csv, 1000, { enabled: true }),
    )
    await act(async () => { await Promise.resolve() })
    unmount()
    await act(async () => { vi.advanceTimersByTime(5000); await Promise.resolve() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
