// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { failNextWriteOnQuota } from '../../../../utils/__tests__/failNextWriteOnQuota'

import { LAST_VIEW_MAX_AGE_MS, namesALocation, readLastView, saveLastView } from './lastViewStore'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('lastViewStore', () => {
  it('reads back the view saved for the same scope only', () => {
    saveLastView('east:1', { viewer: 'map', url: '/east?lat=1&lng=2' }, 100)

    expect(readLastView('east:1', 200)).toEqual({ viewer: 'map', url: '/east?lat=1&lng=2', savedAt: 100 })
    expect(readLastView('east:2', 200)).toBeNull()
  })

  it('forgets a view older than the maximum age', () => {
    saveLastView('east:1', { viewer: 'bim', url: '/east?camX=1' }, 0)

    expect(readLastView('east:1', LAST_VIEW_MAX_AGE_MS + 1)).toBeNull()
  })

  it('rejects stored values that are malformed or leave the origin', () => {
    window.localStorage.setItem('cdt:lastView:east:1', '{not json')
    expect(readLastView('east:1')).toBeNull()

    window.localStorage.setItem('cdt:lastView:east:1', JSON.stringify({ viewer: 'map', url: '//evil.example', savedAt: Date.now() }))
    expect(readLastView('east:1')).toBeNull()
  })

  it('saves into a store that refetchable caches have filled', () => {
    window.localStorage.setItem('datasetCache:k', '1')
    failNextWriteOnQuota()

    saveLastView('east:1', { viewer: 'map', url: '/east?lat=1&lng=2' }, 100)

    expect(readLastView('east:1', 200)?.url).toBe('/east?lat=1&lng=2')
  })

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })

    expect(() => saveLastView('east:1', { viewer: 'map', url: '/east' })).not.toThrow()
    expect(readLastView('east:1')).toBeNull()
  })

  it('treats a URL with a place or camera as naming a location', () => {
    expect(namesALocation(new URLSearchParams('viewer=map'))).toBe(false)
    expect(namesALocation(new URLSearchParams('municipality=Ottawa'))).toBe(true)
    expect(namesALocation(new URLSearchParams('lat=45&lng=-75'))).toBe(true)
    expect(namesALocation(new URLSearchParams('camX=1'))).toBe(true)
  })
})
