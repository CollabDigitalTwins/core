// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { validateManifest } from '../sdk/types'
import { PLUGIN_HOST_API } from '../sdk/version'

import { createPluginContext } from './context'
import { PluginActivationError, PluginHostApiError, PluginManifestError } from './errors'

import type { PluginRegistry } from './registry'
import type { PluginManifest, PluginEntry, PluginContext } from '../sdk/types'

type PluginStatus = 'active' | 'inactive' | 'errored'

interface LoadedPlugin {
  manifest: PluginManifest
  entry: PluginEntry
  /** Null when the plugin was rejected before a context could be created. */
  context: PluginContext | null
  status: PluginStatus
  /** Set when status is 'errored', so the extensions page can show the reason. */
  error?: string
}

export class PluginHost {
  private plugins: Map<string, LoadedPlugin> = new Map()

  constructor(private registry: PluginRegistry) {}

  /**
   * Validate, then activate. Rejection is recorded as an `errored` plugin rather
   * than thrown: the caller is loading a list, and one bad plugin must not stop
   * the rest — nor take down the app around them.
   */
  async loadPlugin(
    manifest: PluginManifest,
    entry: PluginEntry,
    config: Record<string, unknown>,
  ): Promise<void> {
    // Plugin bundles are third-party input from here on. `manifest.slug` is used
    // as the map key and the context's identity, so it has to be trusted before
    // anything else reads it.
    const { valid, errors } = validateManifest(manifest)
    const slug = typeof manifest?.slug === 'string' && manifest.slug ? manifest.slug : '<invalid>'

    if (!valid) {
      this.reject(slug, manifest, entry, new PluginManifestError(slug, errors))
      return
    }

    if (manifest.hostApi === undefined) {
      console.warn(
        `Plugin "${slug}" does not declare "hostApi" in its manifest. Assuming ${PLUGIN_HOST_API}; declare it so a future breaking change fails to load instead of failing to render.`,
      )
    } else if (manifest.hostApi !== PLUGIN_HOST_API) {
      this.reject(slug, manifest, entry, new PluginHostApiError(slug, manifest.hostApi, PLUGIN_HOST_API))
      return
    }

    const context = createPluginContext({
      pluginId: slug,
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
      const error = new PluginActivationError(slug, err as Error)
      loaded.error = error.message
      console.error(error.message)
      // A plugin that threw part-way through activate() may already have
      // registered some contributions. Drop them so it is all-or-nothing.
      this.registry.deregisterAll(slug)
    }

    this.plugins.set(slug, loaded)
  }

  async unloadPlugin(slug: string): Promise<void> {
    const loaded = this.plugins.get(slug)
    if (!loaded) return

    try {
      if (loaded.entry.deactivate && loaded.context) {
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

  getError(slug: string): string | undefined {
    return this.plugins.get(slug)?.error
  }

  // Keyed off the map, not `manifest.slug` — a plugin rejected for an invalid
  // manifest may have no usable slug of its own.
  listPlugins(): Array<{ slug: string; status: PluginStatus; error?: string }> {
    return Array.from(this.plugins, ([slug, p]) => ({
      slug,
      status: p.status,
      ...(p.error ? { error: p.error } : {}),
    }))
  }

  private reject(
    slug: string,
    manifest: PluginManifest,
    entry: PluginEntry,
    error: Error,
  ): void {
    console.error(error.message)
    this.plugins.set(slug, {
      manifest,
      entry,
      context: null,
      status: 'errored',
      error: error.message,
    })
  }
}
