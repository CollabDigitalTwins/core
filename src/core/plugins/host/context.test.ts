// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { createPluginContext } from './context'
import { PluginRegistry } from './registry'

describe('createPluginContext', () => {
  let registry: PluginRegistry

  beforeEach(() => {
    registry = new PluginRegistry()
  })

  it('exposes pluginId, config, and register', () => {
    const ctx = createPluginContext({
      pluginId: 'test',
      capabilities: ['viewer.tabs'],
      config: { foo: 'bar' },
      registry,
    })
    expect(ctx.pluginId).toBe('test')
    expect(ctx.config).toEqual({ foo: 'bar' })
    expect(typeof ctx.register).toBe('function')
  })

  it('registers an entry for a declared capability with pluginId merged', () => {
    const ctx = createPluginContext({
      pluginId: 'my-plugin',
      capabilities: ['viewer.tabs'],
      config: {},
      registry,
    })
    ctx.register('viewer.tabs', {
      id: 'home',
      labelKey: 'Home',
      icon: 'Home',
      component: () => null,
    })

    const entries = registry.getAll('viewer.tabs')
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ id: 'home', pluginId: 'my-plugin' })
  })

  it('supports multiple declared capabilities', () => {
    const ctx = createPluginContext({
      pluginId: 'test',
      capabilities: ['viewer.tabs', 'map.tools'],
      config: {},
      registry,
    })

    ctx.register('viewer.tabs', { id: 's', labelKey: 'S', icon: 'Home', component: () => null })
    ctx.register('map.tools', { id: 't', label: 'T', icon: 'Wrench', component: () => null })

    expect(registry.getAll('viewer.tabs')).toHaveLength(1)
    expect(registry.getAll('map.tools')).toHaveLength(1)
  })

  it('throws when registering for an undeclared capability', () => {
    const ctx = createPluginContext({
      pluginId: 'strict-plugin',
      capabilities: ['viewer.tabs'],
      config: {},
      registry,
    })

    expect(() =>
      ctx.register('map.tools', {
        id: 't',
        label: 'T',
        icon: 'Wrench',
        component: () => null,
      }),
    ).toThrow('Plugin "strict-plugin" did not declare capability "map.tools" in its manifest')
  })

  it('pluginId in the item payload cannot override the context pluginId', () => {
    const ctx = createPluginContext({
      pluginId: 'real-id',
      capabilities: ['viewer.tabs'],
      config: {},
      registry,
    })

    ctx.register('viewer.tabs', {
      id: 'x',
      labelKey: 'X',
      icon: 'Home',
      component: () => null,
      // @ts-expect-error - caller attempts to inject a different pluginId
      pluginId: 'spoofed',
    })

    expect(registry.getAll('viewer.tabs')[0].pluginId).toBe('real-id')
  })

  it('separate contexts register side-by-side in the same capability', () => {
    const ctxA = createPluginContext({
      pluginId: 'A',
      capabilities: ['viewer.tabs'],
      config: {},
      registry,
    })
    const ctxB = createPluginContext({
      pluginId: 'B',
      capabilities: ['viewer.tabs'],
      config: {},
      registry,
    })

    ctxA.register('viewer.tabs', { id: 'a', labelKey: 'A', icon: 'Home', component: () => null })
    ctxB.register('viewer.tabs', { id: 'b', labelKey: 'B', icon: 'Home', component: () => null })

    const entries = registry.getAll('viewer.tabs')
    expect(entries.map(e => e.pluginId).sort()).toEqual(['A', 'B'])
  })
})
