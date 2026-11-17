// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { browserTourStore } from './tourStore'

const memory = () => {
  const values = new Map<string, string>()
  return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => void values.set(k, v) }
}

describe('browserTourStore', () => {
  it('starts not done and stays done once marked', () => {
    const store = browserTourStore({ namespace: 'cdt' }, memory())
    expect(store.isDone('map')).toBe(false)
    store.markDone('map')
    expect(store.isDone('map')).toBe(true)
  })

  it('marks one tour without marking the others', () => {
    const store = browserTourStore({ namespace: 'cdt' }, memory())
    store.markDone('map')
    expect(store.isDone('report')).toBe(false)
  })

  it('keeps namespaces apart', () => {
    const backing = memory()
    browserTourStore({ namespace: 'a' }, backing).markDone('map')
    expect(browserTourStore({ namespace: 'b' }, backing).isDone('map')).toBe(false)
  })

  it('writes the namespaced key', () => {
    const backing = memory()
    browserTourStore({ namespace: 'arts-ottawa-clum' }, backing).markDone('map')
    expect(backing.values.get('arts-ottawa-clum.tour.map.hidden')).toBe('1')
  })

  it('treats storage that throws as not done', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    const store = browserTourStore({ namespace: 'cdt' }, broken)
    expect(() => store.markDone('map')).not.toThrow()
    expect(store.isDone('map')).toBe(false)
  })

  it('treats missing storage as not done', () => {
    const store = browserTourStore({ namespace: 'cdt' }, null)
    store.markDone('map')
    expect(store.isDone('map')).toBe(false)
  })
})
