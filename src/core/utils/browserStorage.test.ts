// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { failNextWriteOnQuota } from './__tests__/failNextWriteOnQuota'

import { pruneRetiredStorage, setItemMakingRoom } from './browserStorage'

const seed = (entries: Record<string, string>) =>
  Object.entries(entries).forEach(([key, value]) => window.localStorage.setItem(key, value))

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('pruneRetiredStorage', () => {
  it('removes retired caches and keeps current ones and user data', () => {
    seed({
      'features:arcgis:a': '1',
      'bim:spatial-structure:v1:m': '1',
      'bim:spatial-structure:v3:m': '1',
      'datasetCache:k': '1',
      'cdt:lastView:east:1': '1',
    })

    pruneRetiredStorage()

    expect(Object.keys(window.localStorage).sort()).toEqual([
      'bim:spatial-structure:v3:m',
      'cdt:lastView:east:1',
      'datasetCache:k',
    ])
  })
})

describe('setItemMakingRoom', () => {
  it('evicts rebuildable caches when the store is full, then writes', () => {
    seed({ 'datasetCache:k': '1', 'bim:spatial-structure:v3:m': '1', 'cdt:other': '1' })
    failNextWriteOnQuota()

    setItemMakingRoom('cdt:lastView:east:1', 'view')

    expect(Object.keys(window.localStorage).sort()).toEqual(['cdt:lastView:east:1', 'cdt:other'])
  })

  it('leaves the store alone on errors other than a full quota', () => {
    seed({ 'datasetCache:k': '1' })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })

    expect(() => setItemMakingRoom('cdt:x', 'v')).toThrow('blocked')
    expect(window.localStorage.getItem('datasetCache:k')).toBe('1')
  })
})
