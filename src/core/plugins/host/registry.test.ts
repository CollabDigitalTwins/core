// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { PluginRegistry } from './registry'

describe('PluginRegistry', () => {
  let registry: PluginRegistry

  beforeEach(() => {
    registry = new PluginRegistry()
  })

  it('registers and retrieves sidebar items', () => {
    const item = { id: 'test', label: 'Test', icon: 'Zap', component: () => null, pluginId: 'test-plugin' }
    registry.register('sidebar.items', item)
    expect(registry.getAll('sidebar.items')).toEqual([item])
  })

  it('registers toolbar items for specific viewer', () => {
    const tool = { id: 'tool1', label: 'Tool', icon: 'Wrench', component: () => null, pluginId: 'test-plugin' }
    registry.register('map.tools', tool)
    expect(registry.getAll('map.tools')).toEqual([tool])
    expect(registry.getAll('bim.tools')).toEqual([])
  })

  it('registers viewer panels', () => {
    const viewer = { id: 'custom', label: 'Custom', icon: 'Box', component: () => null, pluginId: 'test-plugin' }
    registry.register('viewer.panels', viewer)
    expect(registry.getAll('viewer.panels')).toEqual([viewer])
  })

  it('deregisters all contributions for a plugin', () => {
    const item1 = { id: 'a', label: 'A', icon: 'Zap', component: () => null, pluginId: 'plugin-a' }
    const item2 = { id: 'b', label: 'B', icon: 'Zap', component: () => null, pluginId: 'plugin-b' }
    registry.register('sidebar.items', item1)
    registry.register('sidebar.items', item2)
    registry.deregisterAll('plugin-a')
    expect(registry.getAll('sidebar.items')).toEqual([item2])
  })

  it('returns empty array for unknown extension point', () => {
    expect(registry.getAll('widgets')).toEqual([])
  })

  it('prevents duplicate registration with same id and plugin', () => {
    const item = { id: 'dupe', label: 'Dupe', icon: 'Zap', component: () => null, pluginId: 'test-plugin' }
    registry.register('sidebar.items', item)
    registry.register('sidebar.items', item)
    expect(registry.getAll('sidebar.items')).toHaveLength(1)
  })
})
