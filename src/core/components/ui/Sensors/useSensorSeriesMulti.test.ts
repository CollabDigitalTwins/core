// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SensorDataFormat } from '../../../types/dbTypes'

import { latestValues, useSensorSeriesMulti } from './useSensorSeriesMulti'

const realFetch = global.fetch

const sensor = (id: number, url: string) => ({ id, url, dataFormat: SensorDataFormat.Csv })

/** CSV body with one point per value, 30 min apart, so the last value is the latest. */
function csvBody(values: number[]): string {
  return values.map((v, i) => `${i}:00:00,${v}`).join('\n')
}

/** Routes each URL to its own CSV body so per-sensor results can be told apart. */
function mockByUrl(bodies: Record<string, number[]>) {
  return vi.fn().mockImplementation((url: string) => {
    const values = bodies[url]
    if (!values) return Promise.reject(new Error(`no stub for ${url}`))
    return Promise.resolve({ text: async () => csvBody(values) } as unknown as Response)
  })
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  global.fetch = realFetch
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useSensorSeriesMulti', () => {
  it('fetches every sensor and keys the parsed series by id', async () => {
    // cast: minimal Response stub for fetch, not a full Response
    global.fetch = mockByUrl({ 'http://a': [1, 2], 'http://b': [5] }) as any

    const { result } = renderHook(() =>
      useSensorSeriesMulti([sensor(1, 'http://a'), sensor(2, 'http://b')], { enabled: true }),
    )

    await waitFor(() => expect(result.current.seriesById.size).toBe(2))
    expect(result.current.seriesById.get(1)?.points.map(p => p.value)).toEqual([1, 2])
    expect(result.current.seriesById.get(2)?.points.map(p => p.value)).toEqual([5])
  })

  it('does not fetch when disabled', () => {
    // cast: minimal Response stub for fetch, not a full Response
    global.fetch = vi.fn() as any
    renderHook(() => useSensorSeriesMulti([sensor(1, 'http://a')], { enabled: false }))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('skips sensors with no url', async () => {
    const fetchMock = mockByUrl({ 'http://a': [1] })
    // cast: minimal Response stub for fetch, not a full Response
    global.fetch = fetchMock as any

    const { result } = renderHook(() =>
      useSensorSeriesMulti(
        [sensor(1, 'http://a'), { id: 2, url: null, dataFormat: SensorDataFormat.Csv }],
        { enabled: true },
      ),
    )

    await waitFor(() => expect(result.current.seriesById.size).toBe(1))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.seriesById.has(2)).toBe(false)
  })

  it('keeps the other sensors data when one url fails', async () => {
    // 'http://bad' has no stub, so its fetch rejects.
    // cast: minimal Response stub for fetch, not a full Response
    global.fetch = mockByUrl({ 'http://a': [3] }) as any

    const { result } = renderHook(() =>
      useSensorSeriesMulti([sensor(1, 'http://a'), sensor(2, 'http://bad')], { enabled: true }),
    )

    await waitFor(() => expect(result.current.seriesById.get(1)?.points[0].value).toBe(3))
    expect(result.current.seriesById.has(2)).toBe(false)
  })

  it('keeps a sensor last good series when a later poll fails', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ text: async () => csvBody([8]) } as unknown as Response)
      .mockRejectedValueOnce(new Error('flaky'))
    // cast: minimal Response stub for fetch, not a full Response
    global.fetch = fetchMock as any

    const { result } = renderHook(() =>
      useSensorSeriesMulti([sensor(1, 'http://a')], { enabled: true, pollMs: 1000 }),
    )

    await act(async () => { await Promise.resolve() })
    expect(result.current.seriesById.get(1)?.points[0].value).toBe(8)

    await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve() })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // The failed poll must not blank the series.
    expect(result.current.seriesById.get(1)?.points[0].value).toBe(8)
  })

  it('re-fetches on the poll interval', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ text: async () => csvBody([1]) } as unknown as Response)
      .mockResolvedValueOnce({ text: async () => csvBody([2]) } as unknown as Response)
    // cast: minimal Response stub for fetch, not a full Response
    global.fetch = fetchMock as any

    const { result } = renderHook(() =>
      useSensorSeriesMulti([sensor(1, 'http://a')], { enabled: true, pollMs: 1000 }),
    )

    await act(async () => { await Promise.resolve() })
    await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve() })
    expect(result.current.seriesById.get(1)?.points[0].value).toBe(2)
  })

  it('floors the poll interval at 1s', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue({ text: async () => csvBody([1]) } as unknown as Response)
    // cast: minimal Response stub for fetch, not a full Response
    global.fetch = fetchMock as any

    renderHook(() => useSensorSeriesMulti([sensor(1, 'http://a')], { enabled: true, pollMs: 10 }))
    await act(async () => { await Promise.resolve() })

    await act(async () => { vi.advanceTimersByTime(900); await Promise.resolve() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => { vi.advanceTimersByTime(200); await Promise.resolve() })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('stops polling after unmount', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue({ text: async () => csvBody([1]) } as unknown as Response)
    // cast: minimal Response stub for fetch, not a full Response
    global.fetch = fetchMock as any

    const { unmount } = renderHook(() =>
      useSensorSeriesMulti([sensor(1, 'http://a')], { enabled: true, pollMs: 1000 }),
    )
    await act(async () => { await Promise.resolve() })
    unmount()
    await act(async () => { vi.advanceTimersByTime(5000); await Promise.resolve() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not re-subscribe when re-rendered with an equal but new array', async () => {
    const fetchMock = mockByUrl({ 'http://a': [1] })
    // cast: minimal Response stub for fetch, not a full Response
    global.fetch = fetchMock as any

    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useSensorSeriesMulti([sensor(1, url)], { enabled: true }),
      { initialProps: { url: 'http://a' } },
    )

    await waitFor(() => expect(result.current.seriesById.size).toBe(1))
    rerender({ url: 'http://a' })
    await act(async () => { await Promise.resolve() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('evicts sensors dropped from the set', async () => {
    // cast: minimal Response stub for fetch, not a full Response
    global.fetch = mockByUrl({ 'http://a': [1], 'http://b': [2] }) as any

    const { result, rerender } = renderHook(
      ({ ids }: { ids: number[] }) =>
        useSensorSeriesMulti(
          ids.map(id => sensor(id, id === 1 ? 'http://a' : 'http://b')),
          { enabled: true },
        ),
      { initialProps: { ids: [1, 2] } },
    )

    await waitFor(() => expect(result.current.seriesById.size).toBe(2))
    rerender({ ids: [1] })
    await waitFor(() => expect(result.current.seriesById.size).toBe(1))
    expect(result.current.seriesById.has(2)).toBe(false)
  })
})

describe('latestValues', () => {
  it('takes the last point of each series', () => {
    const seriesById = new Map([
      [1, { points: [{ t: 1, value: 10 }, { t: 2, value: 20 }] }],
      [2, { points: [{ t: 1, value: 5 }] }],
    ])
    expect(latestValues(seriesById)).toEqual(new Map([[1, 20], [2, 5]]))
  })

  it('omits sensors with no points', () => {
    expect(latestValues(new Map([[1, { points: [] }]]))).toEqual(new Map())
  })
})
