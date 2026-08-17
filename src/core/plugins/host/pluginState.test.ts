// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { pluginStateStore } from './pluginState'

describe('pluginStateStore', () => {
  it('returns the initial value until something is written', () => {
    expect(pluginStateStore.get('a', 'unset-key', 'fallback')).toBe('fallback')
  })

  it('reads back what was written', () => {
    pluginStateStore.set('a', 'selection', 'room-1')
    expect(pluginStateStore.get('a', 'selection', null)).toBe('room-1')
  })

  // The property that makes this safe to share between surfaces.
  it('keeps two plugins using the same key apart', () => {
    pluginStateStore.set('one', 'shared', 'mine')
    pluginStateStore.set('two', 'shared', 'theirs')

    expect(pluginStateStore.get('one', 'shared', null)).toBe('mine')
    expect(pluginStateStore.get('two', 'shared', null)).toBe('theirs')
  })

  it('notifies a subscriber on its own key only', () => {
    const listener = vi.fn()
    const other = vi.fn()

    pluginStateStore.subscribe('p', 'watched', listener)
    pluginStateStore.subscribe('p', 'ignored', other)

    pluginStateStore.set('p', 'watched', 1)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(other).not.toHaveBeenCalled()
  })

  it('does not notify when the value is unchanged', () => {
    pluginStateStore.set('p', 'stable', 'same')

    const listener = vi.fn()
    pluginStateStore.subscribe('p', 'stable', listener)
    pluginStateStore.set('p', 'stable', 'same')

    expect(listener).not.toHaveBeenCalled()
  })

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = pluginStateStore.subscribe('p', 'dropped', listener)

    unsubscribe()
    pluginStateStore.set('p', 'dropped', 'value')

    expect(listener).not.toHaveBeenCalled()
  })

  // Called on unload, so a re-enabled plugin starts clean.
  describe('clear', () => {
    it('drops that plugin\'s values and notifies its subscribers', () => {
      pluginStateStore.set('gone', 'key', 'value')
      const listener = vi.fn()
      pluginStateStore.subscribe('gone', 'key', listener)

      pluginStateStore.clear('gone')

      expect(pluginStateStore.get('gone', 'key', 'initial')).toBe('initial')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('leaves every other plugin alone', () => {
      pluginStateStore.set('kept', 'key', 'value')
      pluginStateStore.set('dropped', 'key', 'value')

      pluginStateStore.clear('dropped')

      expect(pluginStateStore.get('kept', 'key', null)).toBe('value')
    })

    // A bare prefix match would take 'room-inventory-v2' down with 'room-inventory'.
    it('does not clear a plugin whose id merely starts the same', () => {
      pluginStateStore.set('rooms', 'key', 'value')
      pluginStateStore.set('rooms-extra', 'key', 'value')

      pluginStateStore.clear('rooms')

      expect(pluginStateStore.get('rooms-extra', 'key', null)).toBe('value')
    })
  })
})
