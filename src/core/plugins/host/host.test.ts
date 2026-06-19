// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { PluginHost } from './host'
import { PluginRegistry } from './registry'
import type { PluginManifest, PluginContext } from '../sdk/types'

describe('PluginHost', () => {
  let registry: PluginRegistry
  let host: PluginHost

  beforeEach(() => {
    registry = new PluginRegistry()
    host = new PluginHost(registry)
  })

  const manifest: PluginManifest = {
    slug: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    capabilities: ['sidebar.items'],
  }

  it('activates a plugin and calls activate()', async () => {
    const activateFn = vi.fn()
    await host.loadPlugin(manifest, { activate: activateFn }, {})

    expect(activateFn).toHaveBeenCalledTimes(1)
    expect(activateFn.mock.calls[0][0].pluginId).toBe('test-plugin')
    expect(host.getStatus('test-plugin')).toBe('active')
  })

  it('enforces declared capabilities via register()', async () => {
    let receivedCtx: PluginContext | null = null
    await host.loadPlugin(manifest, {
      activate(ctx) { receivedCtx = ctx },
    }, {})

    expect(typeof receivedCtx!.register).toBe('function')
    expect(receivedCtx!.pluginId).toBe('test-plugin')
    // Declared capability: register succeeds
    expect(() => receivedCtx!.register('sidebar.items', {
      id: 'ok', label: 'OK', icon: 'Zap', component: () => null,
    })).not.toThrow()
    // Undeclared capability: register throws
    expect(() => receivedCtx!.register('map.tools', {
      id: 'nope', label: 'Nope', icon: 'Wrench', component: () => null,
    })).toThrow(/did not declare capability/)
  })

  it('marks plugin as errored if activate throws', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await host.loadPlugin(manifest, {
      activate() { throw new Error('boom') },
    }, {})

    expect(host.getStatus('test-plugin')).toBe('errored')
    consoleSpy.mockRestore()
  })

  it('deactivates a plugin and cleans up registry', async () => {
    await host.loadPlugin(manifest, {
      activate(ctx) {
        ctx.register('sidebar.items', { id: 'item', label: 'Item', icon: 'Zap', component: () => null })
      },
    }, {})

    expect(registry.getAll('sidebar.items')).toHaveLength(1)

    await host.unloadPlugin('test-plugin')
    expect(registry.getAll('sidebar.items')).toHaveLength(0)
    expect(host.getStatus('test-plugin')).toBe('inactive')
  })

  it('calls deactivate() on the plugin entry when unloading', async () => {
    const deactivateFn = vi.fn()
    await host.loadPlugin(manifest, {
      activate() {},
      deactivate: deactivateFn,
    }, {})

    await host.unloadPlugin('test-plugin')
    expect(deactivateFn).toHaveBeenCalledTimes(1)
  })

  it('passes config to plugin context', async () => {
    let receivedConfig: Record<string, unknown> = {}
    await host.loadPlugin(manifest, {
      activate(ctx) { receivedConfig = ctx.config },
    }, { apiKey: 'secret' })

    expect(receivedConfig).toEqual({ apiKey: 'secret' })
  })

  it('lists all loaded plugins', async () => {
    await host.loadPlugin(manifest, { activate() {} }, {})
    const list = host.listPlugins()
    expect(list).toEqual([{ slug: 'test-plugin', status: 'active' }])
  })
})
