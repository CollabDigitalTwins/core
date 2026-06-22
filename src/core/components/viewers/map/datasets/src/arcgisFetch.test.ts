// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { fetchWithTimeout, fetchArcGISLayerFeatures } from './arcgisFetch'

const realFetch = global.fetch

afterEach(() => {
  global.fetch = realFetch
  vi.useRealTimers()
})

function mockFetch(impl: ReturnType<typeof vi.fn>) {
  global.fetch = impl as unknown as typeof fetch
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response
}

describe('fetchWithTimeout', () => {
  it('returns the response on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    mockFetch(fetchMock)
    const res = await fetchWithTimeout('http://x.com')
    expect(res.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('http://x.com', { signal: expect.any(AbortSignal) })
  })

  it('aborts immediately when the caller signal is already aborted', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      // mirror real fetch: if signal is aborted, reject.
      if (init.signal?.aborted) return Promise.reject(new DOMException('aborted', 'AbortError'))
      return Promise.resolve(jsonResponse({}))
    })
    mockFetch(fetchMock)
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(fetchWithTimeout('http://x.com', 1000, ctrl.signal)).rejects.toThrow()
  })

  it('triggers the controller abort when the caller signal aborts mid-flight', async () => {
    let capturedSignal: AbortSignal | undefined
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedSignal = init.signal as AbortSignal
      return new Promise((_, reject) => {
        capturedSignal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    })
    mockFetch(fetchMock)
    const ctrl = new AbortController()
    const promise = fetchWithTimeout('http://x.com', 1000, ctrl.signal)
    ctrl.abort()
    await expect(promise).rejects.toThrow()
    expect(capturedSignal?.aborted).toBe(true)
  })
})

describe('fetchArcGISLayerFeatures', () => {
  it('pages through results and stops when exceededTransferLimit is false', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        features: Array.from({ length: 1000 }, (_, i) => ({
          type: 'Feature', properties: { i }, geometry: { type: 'Point', coordinates: [i, 0] },
        })),
        exceededTransferLimit: true,
      }))
      .mockResolvedValueOnce(jsonResponse({
        features: [{ type: 'Feature', properties: { i: 1000 }, geometry: { type: 'Point', coordinates: [0, 0] } }],
        exceededTransferLimit: false,
      }))
    mockFetch(fetchMock)

    const collected: GeoJSON.Feature[] = []
    for await (const f of fetchArcGISLayerFeatures('https://x/FeatureServer/0')) collected.push(f)

    expect(collected).toHaveLength(1001)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('stops on a short page even if exceededTransferLimit is missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } }],
    }))
    mockFetch(fetchMock)

    const collected: GeoJSON.Feature[] = []
    for await (const f of fetchArcGISLayerFeatures('https://x/FeatureServer/0', { pageSize: 1000 })) collected.push(f)

    expect(collected).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws on a non-ok response', async () => {
    mockFetch(vi.fn().mockResolvedValue(jsonResponse({}, false, 500)))
    const iter = fetchArcGISLayerFeatures('https://x/FeatureServer/0')
    await expect(iter.next()).rejects.toThrow(/HTTP 500/)
  })

  it('respects maxPages', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      features: Array.from({ length: 1000 }, () => ({
        type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] },
      })),
      exceededTransferLimit: true,
    }))
    mockFetch(fetchMock)

    const collected: GeoJSON.Feature[] = []
    for await (const f of fetchArcGISLayerFeatures('https://x/FeatureServer/0', { maxPages: 2 })) collected.push(f)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(collected).toHaveLength(2000)
  })

  it('aborts cleanly when the signal is pre-aborted', async () => {
    const fetchMock = vi.fn()
    mockFetch(fetchMock)
    const ctrl = new AbortController()
    ctrl.abort()
    const collected: GeoJSON.Feature[] = []
    for await (const f of fetchArcGISLayerFeatures('https://x/FeatureServer/0', { signal: ctrl.signal })) {
      collected.push(f)
    }
    expect(collected).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
