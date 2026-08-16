// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { PluginRegistry } from './registry'

describe('PluginRegistry', () => {
  let registry: PluginRegistry

  beforeEach(() => {
    registry = new PluginRegistry()
  })

  it('registers and retrieves viewer tabs', () => {
    const item = { id: 'test', label: 'Test', icon: 'Zap', component: () => null, pluginId: 'test-plugin' }
    registry.register('viewer.tabs', item)
    expect(registry.getAll('viewer.tabs')).toEqual([item])
  })

  it('registers toolbar items for specific viewer', () => {
    const tool = { id: 'tool1', label: 'Tool', icon: 'Wrench', component: () => null, pluginId: 'test-plugin' }
    registry.register('map.tools', tool)
    expect(registry.getAll('map.tools')).toEqual([tool])
    expect(registry.getAll('bim.tools')).toEqual([])
  })

  it('registers dialogs', () => {
    const dialog = { id: 'custom', titleKey: 'Custom', component: () => null, pluginId: 'test-plugin' }
    registry.register('ui.dialogs', dialog)
    expect(registry.getAll('ui.dialogs')).toEqual([dialog])
  })

  it('deregisters all contributions for a plugin', () => {
    const item1 = { id: 'a', label: 'A', icon: 'Zap', component: () => null, pluginId: 'plugin-a' }
    const item2 = { id: 'b', label: 'B', icon: 'Zap', component: () => null, pluginId: 'plugin-b' }
    registry.register('viewer.tabs', item1)
    registry.register('viewer.tabs', item2)
    registry.deregisterAll('plugin-a')
    expect(registry.getAll('viewer.tabs')).toEqual([item2])
  })

  it('returns empty array for unknown extension point', () => {
    expect(registry.getAll('not.a.capability')).toEqual([])
  })

  it('prevents duplicate registration with same id and plugin', () => {
    const item = { id: 'dupe', label: 'Dupe', icon: 'Zap', component: () => null, pluginId: 'test-plugin' }
    registry.register('viewer.tabs', item)
    registry.register('viewer.tabs', item)
    expect(registry.getAll('viewer.tabs')).toHaveLength(1)
  })

  describe('change notification', () => {
    const item = (id: string, pluginId = 'test-plugin') => ({
      id, pluginId, label: id, icon: 'Zap', component: () => null,
    })

    it('notifies subscribers when a contribution is registered', () => {
      const listener = vi.fn()
      registry.subscribe(listener)

      registry.register('viewer.tabs', item('a'))

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('stops notifying after unsubscribe', () => {
      const listener = vi.fn()
      const unsubscribe = registry.subscribe(listener)
      unsubscribe()

      registry.register('viewer.tabs', item('a'))

      expect(listener).not.toHaveBeenCalled()
    })

    it('does not notify when a duplicate registration is dropped', () => {
      registry.register('viewer.tabs', item('dupe'))
      const listener = vi.fn()
      registry.subscribe(listener)

      registry.register('viewer.tabs', item('dupe'))

      expect(listener).not.toHaveBeenCalled()
    })

    it('does not notify when deregistering a plugin that contributed nothing', () => {
      registry.register('viewer.tabs', item('a', 'plugin-a'))
      const listener = vi.fn()
      registry.subscribe(listener)

      registry.deregisterAll('plugin-b')

      expect(listener).not.toHaveBeenCalled()
    })

    it('notifies once when deregistering a plugin with contributions', () => {
      registry.register('viewer.tabs', item('a', 'plugin-a'))
      registry.register('map.tools', item('b', 'plugin-a'))
      const listener = vi.fn()
      registry.subscribe(listener)

      registry.deregisterAll('plugin-a')

      expect(listener).toHaveBeenCalledTimes(1)
      expect(registry.getAll('viewer.tabs')).toEqual([])
    })

    it('does not notify when clearing an already-empty registry', () => {
      const listener = vi.fn()
      registry.subscribe(listener)

      registry.clear()

      expect(listener).not.toHaveBeenCalled()
    })
  })

  // These identity guarantees are what make useSyncExternalStore correct:
  // a changed capability must yield a new snapshot, an untouched one must not.
  describe('snapshot stability', () => {
    it('returns a new array identity after a change', () => {
      const before = registry.getAll('viewer.tabs')
      registry.register('viewer.tabs', { id: 'a', pluginId: 'p', component: () => null })
      expect(registry.getAll('viewer.tabs')).not.toBe(before)
    })

    it('returns the same array identity when nothing changed', () => {
      registry.register('viewer.tabs', { id: 'a', pluginId: 'p', component: () => null })
      const snapshot = registry.getAll('viewer.tabs')
      expect(registry.getAll('viewer.tabs')).toBe(snapshot)
    })

    it('leaves untouched capabilities at their previous identity', () => {
      const tools = registry.getAll('map.tools')
      registry.register('viewer.tabs', { id: 'a', pluginId: 'p', component: () => null })
      expect(registry.getAll('map.tools')).toBe(tools)
    })

    it('returns a stable empty snapshot for an unregistered capability', () => {
      expect(registry.getAll('map.legends')).toBe(registry.getAll('ui.dialogs'))
    })
  })
})
