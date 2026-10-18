// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDatasetFeatures, VIEWPORT_DEBOUNCE_MS } from './useDatasetFeatures'

import type { FeatureRequest } from '../../../../../../../../types/datasetTypes'
import type { AllGeoJSON } from '@turf/turf'
import type { Map as MapLibreMap } from 'maplibre-gl'

function fakeMap(initialZoom: number) {
  const handlers = new Set<() => void>()
  let zoom = initialZoom
  const map = {
    getZoom: () => zoom,
    getBounds: () => ({ getWest: () => -64, getSouth: () => 44, getEast: () => -63, getNorth: () => 45 }),
    on: (_event: string, handler: () => void) => handlers.add(handler),
    off: (_event: string, handler: () => void) => handlers.delete(handler),
  }
  const moveTo = (nextZoom: number) => {
    zoom = nextZoom
    handlers.forEach(handler => handler())
  }
  return { map: map as unknown as MapLibreMap, moveTo, handlers }
}

const collection = (id: string) => ({ type: 'FeatureCollection', features: [{ type: 'Feature', id, geometry: null, properties: {} }] })

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useDatasetFeatures', () => {
  it('reports a whole load that came back with nothing as empty', async () => {
    const { map } = fakeMap(10)
    const getFeatures = vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] })

    const { result } = renderHook(() => useDatasetFeatures(map, { name: 'parks', getFeatures }))
    await act(async () => {})

    expect(result.current.status).toEqual({ kind: 'empty' })
  })

  it('accepts an empty view once zoomed in, where the area may simply have no features', async () => {
    const { map } = fakeMap(15)
    const getFeatures = vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] })

    const { result } = renderHook(() => useDatasetFeatures(map, { name: 'parks', getFeatures, viewport: { minZoom: 0 } }))
    await act(async () => {})

    expect(result.current.status).toMatchObject({ kind: 'ready', featureCount: 0 })
  })

  it('reports progress while loading, then the size of what arrived', async () => {
    const { map } = fakeMap(10)
    let finish!: (value: AllGeoJSON) => void
    const getFeatures = vi.fn((options?: FeatureRequest) => {
      options?.onProgress?.({ bytes: 2_000_000, totalBytes: 8_000_000, fraction: 0.25 })
      return new Promise<AllGeoJSON>((resolve) => { finish = resolve })
    })

    const { result } = renderHook(() => useDatasetFeatures(map, { name: 'parks', getFeatures }))
    await act(async () => {})
    expect(result.current.status).toEqual({ kind: 'loading', progress: { bytes: 2_000_000, totalBytes: 8_000_000, fraction: 0.25 } })

    await act(async () => finish(collection('a') as AllGeoJSON))
    expect(result.current.status).toEqual({ kind: 'ready', featureCount: 1, bytes: 2_000_000 })
  })

  it('loads a plain dataset once with no view options', async () => {
    const { map, handlers } = fakeMap(10)
    const getFeatures = vi.fn().mockResolvedValue(collection('a'))

    const { result } = renderHook(() => useDatasetFeatures(map, { name: 'roads', getFeatures }))
    await act(async () => {})

    expect(getFeatures).toHaveBeenCalledWith({ onProgress: expect.any(Function), signal: expect.any(AbortSignal) })
    expect(result.current.featureCollection?.features).toHaveLength(1)
    expect(handlers.size).toBe(0)
  })

  it('reports belowMinZoom without fetching, then loads the bbox once zoomed in', async () => {
    const { map, moveTo } = fakeMap(10)
    const getFeatures = vi.fn().mockResolvedValue(collection('a'))

    const { result } = renderHook(() => useDatasetFeatures(map, { name: 'buildings', getFeatures, viewport: { minZoom: 14 } }))
    await act(async () => {})
    expect(result.current.status).toEqual({ kind: 'belowMinZoom', minZoom: 14 })
    expect(getFeatures).not.toHaveBeenCalled()

    moveTo(15)
    await act(async () => { await vi.advanceTimersByTimeAsync(VIEWPORT_DEBOUNCE_MS) })

    expect(getFeatures).toHaveBeenCalledWith(expect.objectContaining({ bbox: [-64, 44, -63, 45], zoom: 15 }))
    expect(result.current.status).toMatchObject({ kind: 'ready' })
  })

  it('keeps only the newest response when pans overlap', async () => {
    const { map, moveTo } = fakeMap(15)
    let resolveFirst: (value: unknown) => void = () => {}
    const getFeatures = vi.fn()
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve }))
      .mockResolvedValueOnce(collection('newest'))

    const { result } = renderHook(() => useDatasetFeatures(map, { name: 'buildings', getFeatures, viewport: { minZoom: 14 } }))
    moveTo(16)
    await act(async () => { await vi.advanceTimersByTimeAsync(VIEWPORT_DEBOUNCE_MS) })
    await act(async () => { resolveFirst(collection('stale')) })

    expect(result.current.featureCollection?.features[0].id).toBe('newest')
  })

  it('exposes the error message for the on-map notice', async () => {
    const { map } = fakeMap(15)
    const getFeatures = vi.fn().mockRejectedValue(new Error('Unknown coordinate system "EPSG:2961"'))

    const { result } = renderHook(() => useDatasetFeatures(map, { name: 'buildings', getFeatures, viewport: { minZoom: 14 } }))
    await act(async () => {})

    expect(result.current.status).toEqual({ kind: 'error', message: 'Unknown coordinate system "EPSG:2961"' })
  })

  it('reports progress only when the rounded percent or feature count moves', async () => {
    const { map } = fakeMap(10)
    let onProgress: FeatureRequest['onProgress']
    const getFeatures = vi.fn((options?: FeatureRequest) => {
      onProgress = options?.onProgress
      return new Promise<AllGeoJSON>(() => {})
    })
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useDatasetFeatures(map, { name: 'parks', getFeatures })
    })
    await act(async () => onProgress?.({ fraction: 0.501, bytes: 1 }))
    const afterFirst = renders

    await act(async () => onProgress?.({ fraction: 0.502, bytes: 2 }))
    expect(renders).toBe(afterFirst)

    await act(async () => onProgress?.({ fraction: 0.6, bytes: 3 }))
    expect(result.current.status).toEqual({ kind: 'loading', progress: { fraction: 0.6, bytes: 3 } })
  })

  it('passes a truncation count through with the features', async () => {
    const { map } = fakeMap(10)
    const getFeatures = vi.fn().mockResolvedValue({ ...collection('a'), truncatedAt: 500_000 })

    const { result } = renderHook(() => useDatasetFeatures(map, { name: 'roads', getFeatures }))
    await act(async () => {})

    expect(result.current.status).toMatchObject({ kind: 'ready', truncatedAt: 500_000 })
  })
})

const signalOf = (call: unknown[]) => (call[0] as FeatureRequest).signal

function rejectOnAbort(options?: FeatureRequest) {
  return new Promise<AllGeoJSON>((_, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
  })
}

describe('useDatasetFeatures cancellation', () => {
  it('aborts a request once a newer view supersedes it', async () => {
    const { map, moveTo } = fakeMap(15)
    const getFeatures = vi.fn(rejectOnAbort)

    renderHook(() => useDatasetFeatures(map, { name: 'buildings', getFeatures, viewport: { minZoom: 14 } }))
    moveTo(16)
    await act(async () => { await vi.advanceTimersByTimeAsync(VIEWPORT_DEBOUNCE_MS) })

    expect(signalOf(getFeatures.mock.calls[0])?.aborted).toBe(true)
    expect(signalOf(getFeatures.mock.calls[1])?.aborted).toBe(false)
  })

  it('aborts the pending request when the layer unmounts', async () => {
    const { map } = fakeMap(10)
    const getFeatures = vi.fn(rejectOnAbort)

    const { unmount } = renderHook(() => useDatasetFeatures(map, { name: 'parks', getFeatures }))
    await act(async () => {})
    unmount()

    expect(signalOf(getFeatures.mock.calls[0])?.aborted).toBe(true)
  })

  it('treats a cancelled request as no outcome rather than a failure', async () => {
    const { map, moveTo } = fakeMap(15)
    const getFeatures = vi.fn(rejectOnAbort)

    const { result } = renderHook(() => useDatasetFeatures(map, { name: 'buildings', getFeatures, viewport: { minZoom: 14 } }))
    moveTo(16)
    await act(async () => { await vi.advanceTimersByTimeAsync(VIEWPORT_DEBOUNCE_MS) })

    expect(result.current.status.kind).toBe('loading')
    expect(console.error).not.toHaveBeenCalled()
  })

  it('still reports an abort it did not ask for, such as a timeout', async () => {
    const { map } = fakeMap(10)
    const getFeatures = vi.fn().mockRejectedValue(new DOMException('The operation timed out', 'AbortError'))

    const { result } = renderHook(() => useDatasetFeatures(map, { name: 'parks', getFeatures }))
    await act(async () => {})

    expect(result.current.status).toMatchObject({ kind: 'error' })
  })
})
