// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useRasterTileStatus } from './useRasterTileStatus'

import type { Map as MapLibreMap } from 'maplibre-gl'

function fakeMap() {
  const handlers = new Map<string, Set<(event: Record<string, unknown>) => void>>()
  let loaded = false
  const map = {
    on: (type: string, handler: (event: Record<string, unknown>) => void) => {
      if (!handlers.has(type)) handlers.set(type, new Set())
      handlers.get(type)?.add(handler)
    },
    off: (type: string, handler: (event: Record<string, unknown>) => void) => handlers.get(type)?.delete(handler),
    isSourceLoaded: () => loaded,
  }
  const emit = (type: string, event: Record<string, unknown>) => act(() => handlers.get(type)?.forEach(handler => handler(event)))
  const request = (count: number) => {
    for (let i = 0; i < count; i += 1) emit('dataloading', { sourceId: 'wms-source', tile: {} })
  }
  return { map: map as unknown as MapLibreMap, emit, request, setLoaded: (value: boolean) => { loaded = value } }
}

const tileError = (message: string) => ({ sourceId: 'wms-source', tile: {}, error: new Error(message) })

describe('useRasterTileStatus', () => {
  it('settles once the map is idle even when some tiles never reported back', () => {
    const { map, emit, request, setLoaded } = fakeMap()
    const { result } = renderHook(() => useRasterTileStatus(map, 'wms-source'))
    request(3)
    emit('data', { sourceId: 'wms-source', tile: {} })
    setLoaded(true)
    emit('idle', {})
    expect(result.current).toEqual({ kind: 'ready' })
  })

  it('fails once the map is idle and no tile ever drew, as when tiles 404 without an error event', () => {
    const { map, emit, request, setLoaded } = fakeMap()
    const { result } = renderHook(() => useRasterTileStatus(map, 'wms-source'))
    request(2)
    setLoaded(true)
    emit('idle', {})
    expect(result.current).toMatchObject({ kind: 'error' })
  })

  it('counts a tile dropped by a pan as settled', () => {
    const { map, emit, request } = fakeMap()
    const { result } = renderHook(() => useRasterTileStatus(map, 'wms-source'))
    request(2)
    emit('data', { sourceId: 'wms-source', tile: {} })
    emit('dataabort', { sourceId: 'wms-source', tile: {} })
    expect(result.current).toEqual({ kind: 'loading', progress: { fraction: 1 } })
  })

  it('counts drawn tiles against requested ones, then is ready once the source has them all', () => {
    const { map, emit, request, setLoaded } = fakeMap()
    const { result } = renderHook(() => useRasterTileStatus(map, 'wms-source'))
    request(2)
    emit('data', { sourceId: 'wms-source', tile: {} })
    expect(result.current).toEqual({ kind: 'loading', progress: { fraction: 0.5 } })

    setLoaded(true)
    emit('data', { sourceId: 'wms-source', tile: {} })
    expect(result.current).toEqual({ kind: 'ready' })
  })

  it('keeps the same status object while the rounded percent has not moved', () => {
    const { map, emit, request } = fakeMap()
    const { result } = renderHook(() => useRasterTileStatus(map, 'wms-source'))
    request(1000)
    emit('data', { sourceId: 'wms-source', tile: {} })
    const first = result.current
    emit('data', { sourceId: 'wms-source', tile: {} })
    expect(result.current).toBe(first)
  })

  it('fails once every requested tile has failed and none drew', () => {
    const { map, emit, request } = fakeMap()
    const { result } = renderHook(() => useRasterTileStatus(map, 'wms-source'))
    request(2)
    emit('error', tileError('Could not load image'))
    expect(result.current).toMatchObject({ kind: 'loading' })

    emit('error', tileError('Could not load image'))
    expect(result.current).toEqual({ kind: 'error', message: 'Could not load image' })
  })

  it('does not fail on a single out-of-extent tile among others still loading', () => {
    const { map, emit, request } = fakeMap()
    const { result } = renderHook(() => useRasterTileStatus(map, 'wms-source'))
    request(4)
    emit('error', tileError('HTTP 404'))
    expect(result.current).toEqual({ kind: 'loading', progress: { fraction: 0.25 } })
  })

  it('shrugs off a missing edge tile once others have drawn', () => {
    const { map, emit, request, setLoaded } = fakeMap()
    const { result } = renderHook(() => useRasterTileStatus(map, 'wms-source'))
    request(1)
    setLoaded(true)
    emit('data', { sourceId: 'wms-source', tile: {} })
    emit('error', tileError('HTTP 404'))
    expect(result.current).toEqual({ kind: 'ready' })
  })
})
