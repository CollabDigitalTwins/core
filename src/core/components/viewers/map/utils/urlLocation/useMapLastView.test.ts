// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readLastView } from '../../../shared/lastView/lastViewStore'

import { useMapLastView } from './useMapLastView'

import type { Map as MapLibreMap } from 'maplibre-gl'

vi.mock('../../../shared/lastView/useLastViewScope', () => ({ useLastViewScope: () => 'east:1' }))

function fakeMap() {
  const handlers = new Map<string, (event?: unknown) => void>()
  const map = {
    on: (type: string, handler: (event?: unknown) => void) => handlers.set(type, handler),
    off: (type: string) => handlers.delete(type),
    getCenter: () => ({ lat: 45.4215, lng: -75.6972 }),
    getZoom: () => 14,
    getBearing: () => 30,
    getPitch: () => 45,
    getBounds: () => ({ getWest: () => -76, getSouth: () => 45, getEast: () => -75, getNorth: () => 46 }),
  } as unknown as MapLibreMap
  const fire = (type: string, event: unknown = {}) => handlers.get(type)?.(event)
  return { map, fire, handlers }
}

const savedParams = () => new URLSearchParams(readLastView('east:1')?.url.split('?')[1])

describe('useMapLastView', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/east?viewer=map&municipality=Ottawa')
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('ignores camera moves the user did not start, such as the load-time fly', () => {
    const { map, fire } = fakeMap()
    renderHook(() => useMapLastView(map))

    fire('movestart', {})
    fire('moveend')

    expect(readLastView('east:1')).toBeNull()
  })

  it('remembers where the camera settles after the user moves it', () => {
    const { map, fire } = fakeMap()
    renderHook(() => useMapLastView(map))

    fire('movestart', { originalEvent: new Event('mousedown') })
    fire('moveend')

    expect(readLastView('east:1')?.viewer).toBe('map')
    expect(savedParams().get('lat')).toBe('45.4215')
    expect(savedParams().get('municipality')).toBe('Ottawa')
  })

  it('stops listening once unmounted', () => {
    const { map, handlers } = fakeMap()
    const { unmount } = renderHook(() => useMapLastView(map))

    unmount()

    expect(handlers.size).toBe(0)
  })
})
