// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MIN_SUBDIVISION_PICK_ZOOM, useCameraSubdivision } from './useCameraSubdivision'

import type { Map as MaplibreMap } from 'maplibre-gl'

type Handler = (...args: unknown[]) => void

function fakeMap(zoom: number) {
  const handlers: Record<string, Handler[]> = {}
  const map = {
    zoom,
    getZoom: () => map.zoom,
    getLayer: () => ({}),
    getCenter: () => ({ lng: 0, lat: 0 }),
    project: () => ({ x: 0, y: 0 }),
    queryRenderedFeatures: () => [{ properties: { ISO_CC: 'CA', ISO_CODE: 'CAON' } }],
    on: (event: string, fn: Handler) => { (handlers[event] ??= []).push(fn) },
    off: vi.fn(),
    fire: (event: string) => handlers[event]?.forEach(fn => fn({})),
  }
  return map
}

function mount(map: ReturnType<typeof fakeMap>) {
  const onResolve = vi.fn()
  const onClear = vi.fn()
  renderHook(() => useCameraSubdivision({
    map: map as unknown as MaplibreMap,
    layerId: 'fill',
    sourceId: 'source',
    enabled: true,
    onResolve,
    onClear,
  }))
  return { onResolve, onClear }
}

describe('useCameraSubdivision', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('never resolves below the pick zoom', () => {
    const map = fakeMap(MIN_SUBDIVISION_PICK_ZOOM - 2)
    const { onResolve } = mount(map)
    map.fire('moveend')
    vi.runAllTimers()
    expect(onResolve).not.toHaveBeenCalled()
  })

  it('clears below the pick zoom only after a finished move', () => {
    const map = fakeMap(MIN_SUBDIVISION_PICK_ZOOM - 2)
    const { onClear } = mount(map)
    vi.runAllTimers()
    expect(onClear).not.toHaveBeenCalled()

    map.fire('moveend')
    vi.runAllTimers()
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('resolves the subdivision at or above the pick zoom', () => {
    const map = fakeMap(MIN_SUBDIVISION_PICK_ZOOM)
    const { onResolve, onClear } = mount(map)
    map.fire('moveend')
    vi.runAllTimers()
    expect(onResolve).toHaveBeenCalled()
    expect(onClear).not.toHaveBeenCalled()
  })
})
