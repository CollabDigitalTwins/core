// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchJson, fetchWithTimeout, proxiedUrl, readJsonWithProgress, trackPages } from './http'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('fetchWithTimeout', () => {
  it('aborts when the caller signal is already aborted', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => (init.signal?.aborted ? Promise.reject(new DOMException('aborted', 'AbortError')) : Promise.resolve(new Response('{}')))))
    const controller = new AbortController()
    controller.abort()
    await expect(fetchWithTimeout('https://x', 1_000, controller.signal)).rejects.toThrow('aborted')
  })

  it('aborts once the timeout passes', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new Error('timed out'))))))
    const pending = fetchWithTimeout('https://x', 50)
    vi.advanceTimersByTime(50)
    await expect(pending).rejects.toThrow('timed out')
  })

  it('keeps the caller signal wired up after the headers arrive, so it can still cancel the body', async () => {
    let requestSignal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      requestSignal = init.signal ?? undefined
      return new Response('{}')
    }))
    const controller = new AbortController()
    await fetchWithTimeout('https://x', 1_000, controller.signal)
    controller.abort()
    expect(requestSignal?.aborted).toBe(true)
  })
})

describe('fetchJson', () => {
  it('returns null for failed requests instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    expect(await fetchJson('https://x')).toBeNull()
  })
})

describe('proxiedUrl', () => {
  it('routes every provider through the one open-data proxy in the browser', () => {
    vi.stubGlobal('window', {})
    expect(proxiedUrl('https://data.example.org/a?b=1')).toBe('/api/openDataProxy?url=https%3A%2F%2Fdata.example.org%2Fa%3Fb%3D1')
  })

  it('leaves the URL alone on the server', () => {
    expect(proxiedUrl('https://data.example.org/a')).toBe('https://data.example.org/a')
  })
})

describe('readJsonWithProgress', () => {
  it('parses the body and reports bytes against content-length', async () => {
    const body = JSON.stringify({ type: 'FeatureCollection', features: [] })
    const response = new Response(body, { headers: { 'content-length': String(body.length) } })
    const reports: Array<{ bytes?: number; fraction?: number }> = []
    const parsed = await readJsonWithProgress<{ type: string }>(response, progress => reports.push(progress))
    expect(parsed.type).toBe('FeatureCollection')
    expect(reports.at(-1)).toMatchObject({ bytes: body.length, totalBytes: body.length, fraction: 1 })
  })

  it('reports no fraction when the length is unknown or smaller than the decoded body', async () => {
    const reports: Array<{ fraction?: number; totalBytes?: number }> = []
    await readJsonWithProgress(new Response('{"a":1}', { headers: { 'content-length': '2' } }), progress => reports.push(progress))
    expect(reports.at(-1)?.fraction).toBeUndefined()
    expect(reports.at(-1)?.totalBytes).toBeUndefined()
  })
})

describe('trackPages', () => {
  it('adds the bytes of every page to the features counted so far', () => {
    const reports: Array<Record<string, number | undefined>> = []
    const tracker = trackPages(progress => reports.push({ ...progress }), 200)
    tracker.bytes()?.({ bytes: 1_000 })
    tracker.bytes()?.({ bytes: 3_000 })
    tracker.onPage(new Array(100).fill(0))
    expect(reports.at(-1)).toEqual({ featureCount: 100, totalFeatureCount: 200, fraction: 0.5, bytes: 4_000 })
  })

  it('counts a page once however often its listener hears it', () => {
    const reports: Array<Record<string, number | undefined>> = []
    const tracker = trackPages(progress => reports.push({ ...progress }))
    const page = tracker.bytes()
    page?.({ bytes: 1_000 })
    page?.({ bytes: 2_500 })
    tracker.onPage([1])
    expect(reports.at(-1)).toEqual({ featureCount: 1, bytes: 2_500 })
  })

  it('throttles byte updates but always reports a finished page', () => {
    vi.useFakeTimers()
    const reports: Array<Record<string, number | undefined>> = []
    const tracker = trackPages(progress => reports.push({ ...progress }))
    const page = tracker.bytes()
    page?.({ bytes: 1_000 })
    page?.({ bytes: 2_000 })
    expect(reports).toHaveLength(1)
    vi.advanceTimersByTime(100)
    page?.({ bytes: 3_000 })
    tracker.onPage([1, 2])
    expect(reports).toEqual([{ featureCount: 0, bytes: 1_000 }, { featureCount: 0, bytes: 3_000 }, { featureCount: 2, bytes: 3_000 }])
  })

  it('does nothing without a listener', () => {
    const tracker = trackPages(undefined, 4)
    expect(tracker.bytes()).toBeUndefined()
    expect(() => tracker.onPage([1])).not.toThrow()
  })
})
