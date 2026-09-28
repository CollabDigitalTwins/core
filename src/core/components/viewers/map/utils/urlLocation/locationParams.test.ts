// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'

import { clearFinerLabels, flyAndSyncUrl, withLocationParams, writeLocationParams } from './locationParams'

import type { CameraSnapshot } from './locationParams'
import type { Map as MapLibreMap } from 'maplibre-gl'

const camera: CameraSnapshot = {
  lat: 46.812345678,
  lng: -71.212345678,
  zoom: 12.3456,
  bearing: 10.04,
  pitch: 0,
  bounds: [-71.5, 46.7, -71.1, 46.9],
}

const fakeMap = (overrides: Record<string, unknown> = {}) => ({
  once: vi.fn(),
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  getCenter: () => ({ lat: camera.lat, lng: camera.lng }),
  getZoom: () => camera.zoom,
  getBearing: () => camera.bearing,
  getPitch: () => camera.pitch,
  getBounds: () => ({ getWest: () => -71.5, getSouth: () => 46.7, getEast: () => -71.1, getNorth: () => 46.9 }),
  ...overrides,
}) as unknown as MapLibreMap

describe('withLocationParams', () => {
  it('writes the camera and labels, deletes empty labels and keeps unrelated params', () => {
    const next = withLocationParams(new URLSearchParams('viewer=map&address=old'), camera, { municipality: 'Québec', countrySubdivision: 'QC' })

    expect(Object.fromEntries(next)).toEqual({
      viewer: 'map',
      lat: '46.8123457',
      lng: '-71.2123457',
      zoom: '12.35',
      bearing: '10',
      pitch: '0',
      bbox: '-71.5,46.7,-71.1,46.9',
      municipality: 'Québec',
      countrySubdivision: 'QC',
    })
  })
})

describe('withLocationParams on a shared BIM or building URL', () => {
  it('replaces only map-location params and keeps buildingId, site and the BIM camera', () => {
    const current = new URLSearchParams('viewer=bim&buildingId=9&site=4&camX=0&camY=12.5&camZ=-3&tarX=0&tarY=0&tarZ=0&lat=1&lng=2&address=old')

    const next = withLocationParams(current, camera, { municipality: 'Québec' })

    expect(Object.fromEntries(next)).toMatchObject({
      viewer: 'bim', buildingId: '9', site: '4',
      camX: '0', camY: '12.5', camZ: '-3', tarX: '0', tarY: '0', tarZ: '0',
      lat: '46.8123457', municipality: 'Québec',
    })
    expect(next.has('address')).toBe(false)
  })
})

describe('clearFinerLabels', () => {
  it('drops labels below the level flown to', () => {
    expect(clearFinerLabels({ country: 'CA', municipality: 'Ottawa', site: '4', address: 'x', buildingId: '9' }, 'municipality'))
      .toEqual({ country: 'CA', municipality: 'Ottawa' })
  })
})

describe('writeLocationParams', () => {
  it('never forwards the Next.js __NA marker, so the app router adopts the new URL', () => {
    window.history.replaceState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: [] }, '', '/?viewer=map')
    const replaceState = vi.spyOn(window.history, 'replaceState')

    writeLocationParams(fakeMap(), { municipality: 'Québec' })

    expect(replaceState.mock.calls[0][0]).not.toHaveProperty('__NA')
    replaceState.mockRestore()
  })
})

describe('flyAndSyncUrl', () => {
  it('rewrites the URL only after the fly settles', async () => {
    window.history.replaceState(null, '', '/?viewer=map&municipality=quebec')
    let onMoveEnd: () => void = () => {}
    const fitBounds = vi.fn()
    const map = fakeMap({ fitBounds, once: (_event: string, listener: () => void) => { onMoveEnd = listener } })

    const synced = flyAndSyncUrl(map, { bounds: camera.bounds }, { municipality: 'Québec' })
    expect(fitBounds).toHaveBeenCalledWith(camera.bounds, { speed: 2 })
    expect(window.location.search).toBe('?viewer=map&municipality=quebec')

    onMoveEnd()
    await synced
    const url = new URLSearchParams(window.location.search)
    expect(url.get('municipality')).toBe('Québec')
    expect(url.get('zoom')).toBe('12.35')
    expect(url.get('bbox')).toBe('-71.5,46.7,-71.1,46.9')
    expect(window.location.search).toContain('bbox=-71.5,46.7,-71.1,46.9')
  })
})
