// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CAMPUS_CAMERA, canReachCampus, demoMeasure, uncoveredCentre } from './tourPlace'

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

describe('uncoveredCentre', () => {
  const box = (left: number, width: number) => ({ left, right: left + width, top: 0, height: 640, width }) as DOMRect
  const mapIn = (container: DOMRect) => {
    const element = document.createElement('div')
    element.getBoundingClientRect = () => container
    return { getContainer: () => element, unproject: vi.fn(([x, y]: [number, number]) => ({ x, y })) }
  }
  const panel = (rect: DOMRect) => {
    const element = document.createElement('div')
    element.getBoundingClientRect = () => rect
    return element
  }

  it('is the middle of the map when nothing covers it', () => {
    const map = mapIn(box(0, 360))
    uncoveredCentre(map as unknown as MapLibreMap, null)
    expect(map.unproject).toHaveBeenCalledWith([180, 320])
  })

  it('is the middle of the strip a side panel leaves uncovered', () => {
    const map = mapIn(box(0, 360))
    uncoveredCentre(map as unknown as MapLibreMap, panel(box(0, 288)))
    expect(map.unproject).toHaveBeenCalledWith([324, 320])
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
    expect(clicked).toHaveLength(4)
    expect(clicked[0][0]).toBeCloseTo(-75.6968 + center[0] - CAMPUS_CAMERA.center[0], 6)
    expect(clicked[0][1]).toBeCloseTo(45.3888 + center[1] - CAMPUS_CAMERA.center[1], 6)
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

  it('leaves when the person closes the measure card before a type is picked, but not when the demo stops', () => {
    openMeasureCard()
    const leave = vi.fn()
    const stop = demoMeasure(measureMap(), 'distance', true, vi.fn(), leave)
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

  it('frames the campus in the top of a phone screen, leaving the bottom for the card', () => {
    vi.stubGlobal('innerWidth', 360)
    vi.stubGlobal('innerHeight', 640)
    const flyTo = vi.fn()
    const fitBounds = vi.fn()
    const stop = demoMeasure(Object.assign(measureMap(), { flyTo, fitBounds }), 'distance', true, vi.fn())
    expect(flyTo).not.toHaveBeenCalled()
    expect(fitBounds).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ padding: expect.objectContaining({ bottom: 288 }) }))
    stop()
  })

  it('stays in the tour when picking a measure type closes the dropdown', () => {
    document.body.innerHTML = `<div data-tour="tool-map-measure"><button aria-expanded="true" aria-controls="card"></button></div>
      <div id="card" role="menu"><div role="menuitem" data-tour="measure-distance"></div></div>`
    document.querySelector('[data-tour="measure-distance"]')?.addEventListener('click', () => {
      document.querySelector('[data-tour="tool-map-measure"] button')?.setAttribute('aria-expanded', 'false')
      document.getElementById('card')?.remove()
    })
    const leave = vi.fn()
    const stop = demoMeasure(measureMap(), 'distance', true, vi.fn(), leave)
    vi.advanceTimersByTime(16 * 5)
    expect(document.getElementById('card')).not.toBeNull()
    vi.advanceTimersByTime(CAMPUS_CAMERA.duration)
    expect(document.getElementById('card')).toBeNull()
    vi.advanceTimersByTime(10_000)
    expect(leave).not.toHaveBeenCalled()
    stop()
  })
})
