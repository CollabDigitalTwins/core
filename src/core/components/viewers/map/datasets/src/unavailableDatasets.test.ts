// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DAY_MS, HOUR_MS } from './cache'
import { isDatasetUnavailable, markDatasetUnavailable, unavailableDatasetFilter, useUnavailableDatasetFilter } from './unavailableDatasets'

import type { OpenDataPortal } from '../../../../../types/dbTypes'

const portal = (id: number) => ({ id, apiUrl: `https://portal-${id}.example.org` }) as OpenDataPortal
const dataset = (id: string, portalId = 1) => ({ id, name: id, portal: portal(portalId) })

afterEach(() => vi.useRealTimers())

describe('unavailableDatasets', () => {
  it('remembers a failed dataset for its own portal only', () => {
    markDatasetUnavailable(dataset('parks'), 'failed')
    expect(isDatasetUnavailable(dataset('parks'))).toBe(true)
    expect(isDatasetUnavailable(dataset('parks', 2))).toBe(false)
  })

  it('forgets a failure after an hour but an empty dataset only after a day', () => {
    vi.useFakeTimers()
    markDatasetUnavailable(dataset('flaky'), 'failed')
    markDatasetUnavailable(dataset('blank'), 'empty')
    vi.advanceTimersByTime(HOUR_MS + 1)
    expect(isDatasetUnavailable(dataset('flaky'))).toBe(false)
    expect(isDatasetUnavailable(dataset('blank'))).toBe(true)
    vi.advanceTimersByTime(DAY_MS)
    expect(isDatasetUnavailable(dataset('blank'))).toBe(false)
  })

  it('remembers a denied dataset for a day', () => {
    vi.useFakeTimers()
    markDatasetUnavailable(dataset('private'), 'denied')
    vi.advanceTimersByTime(HOUR_MS + 1)
    expect(isDatasetUnavailable(dataset('private'))).toBe(true)
    vi.advanceTimersByTime(DAY_MS)
    expect(isDatasetUnavailable(dataset('private'))).toBe(false)
  })
})

describe('unavailableDatasetFilter', () => {
  it('matches the datasets remembered when it was built, reading storage once', () => {
    markDatasetUnavailable(dataset('roads'), 'empty')
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const isUnavailable = unavailableDatasetFilter()
    const readsToBuild = getItem.mock.calls.length
    expect(isUnavailable(dataset('roads'))).toBe(true)
    expect(isUnavailable(dataset('roads', 2))).toBe(false)
    expect(isUnavailable(dataset('trees'))).toBe(false)
    expect(getItem.mock.calls.length).toBe(readsToBuild)
    getItem.mockRestore()
  })

  it('skips entries that have expired', () => {
    vi.useFakeTimers()
    markDatasetUnavailable(dataset('stale'), 'failed')
    vi.advanceTimersByTime(HOUR_MS + 1)
    expect(unavailableDatasetFilter()(dataset('stale'))).toBe(false)
  })
})


describe('useUnavailableDatasetFilter', () => {
  it('starts to match a dataset as soon as it is marked', () => {
    const { result } = renderHook(() => useUnavailableDatasetFilter())
    const before = result.current
    expect(result.current(dataset('lakes'))).toBe(false)

    act(() => markDatasetUnavailable(dataset('lakes'), 'denied'))

    expect(result.current(dataset('lakes'))).toBe(true)
    expect(result.current).not.toBe(before)
  })

  it('keeps the same predicate while nothing is marked', () => {
    const { result, rerender } = renderHook(() => useUnavailableDatasetFilter())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
