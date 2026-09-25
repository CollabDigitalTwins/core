// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDatasetFeatures, VIEWPORT_DEBOUNCE_MS } from './useDatasetFeatures'

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
  it('loads a plain dataset once with no view options', async () => {
    const { map, handlers } = fakeMap(10)
    const getFeatures = vi.fn().mockResolvedValue(collection('a'))

    const { result } = renderHook(() => useDatasetFeatures(map, { name: 'roads', getFeatures }))
    await act(async () => {})

    expect(getFeatures).toHaveBeenCalledWith(undefined)
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

    expect(getFeatures).toHaveBeenCalledWith({ bbox: [-64, 44, -63, 45], zoom: 15 })
    expect(result.current.status).toEqual({ kind: 'ready' })
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
})
