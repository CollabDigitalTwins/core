// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { fetchAllPages } from './paginate'

const rows = (count: number) => Array.from({ length: count }, (_, i) => i)

describe('fetchAllPages', () => {
  it('fetches every page in parallel when the total is known', async () => {
    const all = rows(70_000)
    const fetchPage = vi.fn(async (offset: number, limit: number) => ({ items: all.slice(offset, offset + limit), hasMore: false }))
    const result = await fetchAllPages({ fetchPage, pageSize: 32_000, total: all.length })
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(result).toEqual({ items: all, truncated: false })
  })

  it('advances by what each page returned when the server caps the page size', async () => {
    const all = rows(250)
    const fetchPage = vi.fn(async (offset: number) => {
      const items = all.slice(offset, offset + 100)
      return { items, hasMore: offset + items.length < all.length }
    })
    const result = await fetchAllPages({ fetchPage, pageSize: 1_000 })
    expect(fetchPage.mock.calls.map(([offset]) => offset)).toEqual([0, 100, 200])
    expect(result.items).toEqual(all)
  })

  it('hands over each page as it arrives', async () => {
    const all = rows(250)
    const pages: number[][] = []
    await fetchAllPages({
      fetchPage: async (offset: number) => ({ items: all.slice(offset, offset + 100), hasMore: offset + 100 < all.length }),
      pageSize: 100,
      onPage: items => pages.push(items),
    })
    expect(pages.map(page => page.length)).toEqual([100, 100, 50])
  })

  it('stops at the hard cap and reports truncation', async () => {
    const fetchPage = vi.fn(async (offset: number, limit: number) => ({ items: rows(limit).map(i => i + offset), hasMore: true }))
    const result = await fetchAllPages({ fetchPage, pageSize: 10, hardCap: 25 })
    expect(result.items).toHaveLength(25)
    expect(result.truncated).toBe(true)
  })

  it('fails the whole load when one parallel page fails', async () => {
    const fetchPage = vi.fn(async (offset: number) => {
      if (offset === 10) throw new Error('boom')
      return { items: rows(10), hasMore: false }
    })
    await expect(fetchAllPages({ fetchPage, pageSize: 10, total: 30 })).rejects.toThrow('boom')
  })

  it('aborts the pages still in flight and never starts the rest once one parallel page fails', async () => {
    const signals = new Map<number, AbortSignal>()
    const fetchPage = vi.fn((offset: number, _limit: number, signal?: AbortSignal) => {
      if (signal) signals.set(offset, signal)
      if (offset === 10) return Promise.reject(new Error('boom'))
      return new Promise<{ items: number[]; hasMore: boolean }>((_, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    await expect(fetchAllPages({ fetchPage, pageSize: 10, total: 100, concurrency: 2 })).rejects.toThrow('boom')
    expect(fetchPage.mock.calls.map(([offset]) => offset)).toEqual([0, 10])
    expect(signals.get(0)?.aborted).toBe(true)
  })

  it('stops fetching pages once the caller aborts', async () => {
    const controller = new AbortController()
    const fetchPage = vi.fn(async (offset: number) => {
      if (offset === 10) controller.abort()
      return { items: rows(10), hasMore: true }
    })
    await expect(fetchAllPages({ fetchPage, pageSize: 10, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('stops scheduling parallel pages once the caller aborts', async () => {
    const controller = new AbortController()
    const fetchPage = vi.fn(async (offset: number) => {
      if (offset === 0) controller.abort()
      return { items: rows(10), hasMore: false }
    })
    await expect(fetchAllPages({ fetchPage, pageSize: 10, total: 100, concurrency: 1, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })
})
