// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { withConcurrencyLimit } from '../../../../../utils/concurrency'

import { throwIfAborted } from './http'

const MAX_FEATURES_IN_MEMORY = 500_000

interface Page<T> {
  items: T[]
  hasMore: boolean
}

interface PaginateOptions<T> {
  fetchPage: (offset: number, limit: number, signal?: AbortSignal) => Promise<Page<T>>
  pageSize: number
  total?: number | null
  concurrency?: number
  hardCap?: number
  onPage?: (items: T[]) => void
  signal?: AbortSignal
}

interface Paginated<T> {
  items: T[]
  truncated: boolean
}

function linkedController(signal?: AbortSignal): AbortController {
  const controller = new AbortController()
  if (signal?.aborted) controller.abort(signal.reason)
  else signal?.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  return controller
}

async function pagesInParallel<T>(options: PaginateOptions<T>, total: number, cap: number): Promise<T[]> {
  const offsets = Array.from({ length: Math.ceil(Math.min(total, cap) / options.pageSize) }, (_, i) => i * options.pageSize)
  const controller = linkedController(options.signal)
  let failure: { reason: unknown } | undefined
  const fetchPage = async (offset: number) => {
    throwIfAborted(controller.signal)
    try {
      return await options.fetchPage(offset, options.pageSize, controller.signal)
    }
    catch (reason) {
      if (!controller.signal.aborted) {
        failure = { reason }
        controller.abort()
      }
      throw reason
    }
  }
  const pages = await withConcurrencyLimit(offsets, options.concurrency ?? 4, fetchPage, page => options.onPage?.(page.items))
  if (failure) throw failure.reason
  throwIfAborted(options.signal)
  return pages.flatMap(page => (page.status === 'fulfilled' ? page.value.items : []))
}

const capped = <T>(items: T[], cap: number) => (items.length > cap ? items.slice(0, cap) : items)

async function pagesInSequence<T>(options: PaginateOptions<T>, cap: number): Promise<{ items: T[]; exhausted: boolean }> {
  const items: T[] = []
  while (items.length < cap) {
    throwIfAborted(options.signal)
    const page = await options.fetchPage(items.length, options.pageSize, options.signal)
    items.push(...page.items)
    options.onPage?.(page.items)
    if (!page.hasMore || page.items.length === 0) return { items, exhausted: true }
  }
  return { items, exhausted: false }
}

/** Every item behind a paged API: in parallel when the total is known, otherwise page by page, advancing by what each page actually returned. */
export async function fetchAllPages<T>(options: PaginateOptions<T>): Promise<Paginated<T>> {
  const cap = options.hardCap ?? MAX_FEATURES_IN_MEMORY
  if (typeof options.total === 'number') {
    const items = await pagesInParallel(options, options.total, cap)
    return { items: capped(items, cap), truncated: options.total > cap }
  }
  const { items, exhausted } = await pagesInSequence(options, cap)
  return { items: capped(items, cap), truncated: !exhausted }
}
