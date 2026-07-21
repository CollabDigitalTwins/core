// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { createPluginContext } from './context'
import { PluginActivationError } from './errors'

import type { PluginRegistry } from './registry'
import type { PluginManifest, PluginEntry, PluginContext } from '../sdk/types'

type PluginStatus = 'active' | 'inactive' | 'errored'

interface LoadedPlugin {
  manifest: PluginManifest
  entry: PluginEntry
  context: PluginContext
  status: PluginStatus
}

export class PluginHost {
  private plugins: Map<string, LoadedPlugin> = new Map()

  constructor(private registry: PluginRegistry) {}

  async loadPlugin(
    manifest: PluginManifest,
    entry: PluginEntry,
    config: Record<string, unknown>,
  ): Promise<void> {
    const context = createPluginContext({
      pluginId: manifest.slug,
      capabilities: manifest.capabilities,
      config,
      registry: this.registry,
    })

    const loaded: LoadedPlugin = {
      manifest,
      entry,
      context,
      status: 'inactive',
    }

    try {
      await entry.activate(context)
      loaded.status = 'active'
    } catch (err) {
      loaded.status = 'errored'
      const error = new PluginActivationError(manifest.slug, err as Error)
      console.error(error.message)
    }

    this.plugins.set(manifest.slug, loaded)
  }

  async unloadPlugin(slug: string): Promise<void> {
    const loaded = this.plugins.get(slug)
    if (!loaded) return

    try {
      if (loaded.entry.deactivate) {
        await loaded.entry.deactivate(loaded.context)
      }
    } catch (err) {
      console.error(`Plugin "${slug}" deactivate error:`, err)
    }

    this.registry.deregisterAll(slug)
    loaded.status = 'inactive'
  }

  getStatus(slug: string): PluginStatus | undefined {
    return this.plugins.get(slug)?.status
  }

  listPlugins(): Array<{ slug: string; status: PluginStatus }> {
    return Array.from(this.plugins.values()).map(p => ({
      slug: p.manifest.slug,
      status: p.status,
    }))
  }
}
