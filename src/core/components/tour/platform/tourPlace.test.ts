// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CAMPUS_CAMERA, canReachCampus, demoMeasure, measureCoordsAround } from './tourPlace'

import type { LngLat } from './platformHost'
import type { Map as MapLibreMap } from 'maplibre-gl'

const reachMap = (bounds: { contains: (lngLat: [number, number]) => boolean } | null, maxZoom = 22, minZoom = 0) =>
  ({ getMaxBounds: () => bounds, getMaxZoom: () => maxZoom, getMinZoom: () => minZoom })

describe('canReachCampus', () => {
  it('is false when the max bounds leave out the campus', () => {
    const contains = vi.fn(() => false)
    expect(canReachCampus(reachMap({ contains }))).toBe(false)
    expect(contains).toHaveBeenCalledWith(CAMPUS_CAMERA.center)
  })

  it('is false when the map cannot zoom in far enough', () => {
    expect(canReachCampus(reachMap(null, 12))).toBe(false)
  })

  it('is false when the map cannot zoom out to the campus view', () => {
    expect(canReachCampus(reachMap(null, 22, 16))).toBe(false)
  })

  it('is true with no max bounds and the default zooms, or bounds that hold the campus', () => {
    expect(canReachCampus(reachMap(null))).toBe(true)
    expect(canReachCampus(reachMap({ contains: () => true }))).toBe(true)
  })

  it('is false without a map', () => {
    expect(canReachCampus(null)).toBe(false)
  })
})

describe('measureCoordsAround', () => {
  it('measures around the map centre', () => {
    const [lng, lat] = measureCoordsAround('area', [0, 0])[0]
    expect(lng).toBeCloseTo(-75.6990 - (-75.6960), 6)
    expect(lat).toBeCloseTo(45.3870 - 45.3842, 6)
  })
})

describe('demoMeasure', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('measures around the current centre without flying when the campus is not used', () => {
    const center: LngLat = [-63.57, 44.65]
    const container = document.createElement('div')
    const map = {
      getCenter: () => ({ lng: center[0], lat: center[1] }),
      flyTo: vi.fn(),
      fire: vi.fn(),
      project: () => ({ x: 0, y: 0 }),
      getContainer: () => container,
      on: vi.fn(),
      off: vi.fn(),
    }
    const stop = demoMeasure(map as unknown as MapLibreMap, 'distance', false, vi.fn())
    vi.advanceTimersByTime(10_000)
    const clicked = map.fire.mock.calls.map(([, event]) => [event.lngLat.lng, event.lngLat.lat])
    expect(map.flyTo).not.toHaveBeenCalled()
    expect(clicked).toEqual(measureCoordsAround('distance', center))
    stop()
  })
  const measureMap = () => ({
    getCenter: () => ({ lng: -63.57, lat: 44.65 }),
    flyTo: vi.fn(),
    fire: vi.fn(),
    project: () => ({ x: 0, y: 0 }),
    getContainer: () => document.createElement('div'),
    on: vi.fn(),
    off: vi.fn(),
  }) as unknown as MapLibreMap

  const openMeasureCard = () => {
    document.body.innerHTML = '<div data-tour="tool-map-measure"><button aria-expanded="true" aria-controls="card"></button></div><div id="card"></div>'
  }

  it('leaves when the person closes the measure card, but not when the demo stops', () => {
    openMeasureCard()
    const leave = vi.fn()
    const stop = demoMeasure(measureMap(), 'distance', false, vi.fn(), leave)
    vi.advanceTimersByTime(16 * 5)
    document.getElementById('card')?.remove()
    vi.advanceTimersByTime(16 * 5)
    expect(leave).toHaveBeenCalledOnce()
    stop()

    openMeasureCard()
    const quiet = vi.fn()
    const stopQuiet = demoMeasure(measureMap(), 'distance', false, vi.fn(), quiet)
    vi.advanceTimersByTime(16 * 5)
    stopQuiet()
    document.getElementById('card')?.remove()
    vi.advanceTimersByTime(16 * 5)
    expect(quiet).not.toHaveBeenCalled()
  })
})
