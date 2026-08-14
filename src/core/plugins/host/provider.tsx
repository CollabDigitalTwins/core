'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { INSTALLED_PLUGINS } from '../installed'

import { resolvePluginEntry } from '../sdk/types'

import { PluginHost } from './host'
import { PluginRegistry } from './registry'


import type { CapabilityRegistry, PluginSource, PluginsInput } from '../sdk/types'

interface PluginHostContextValue {
  registry: PluginRegistry
  host: PluginHost
  ready: boolean
  configs: Record<string, Record<string, unknown>>
}

const PluginHostContext = React.createContext<PluginHostContextValue | null>(null)

export interface PluginHostProviderProps {
  children: React.ReactNode
  /**
   * The plugins to load. Defaults to the set compiled into core. Pass a stable
   * reference — a module-scope array or a `useCallback` thunk — since a fresh
   * literal re-resolves the list on every render.
   */
  plugins?: PluginsInput
  /**
   * Slugs to activate. `undefined` activates everything, for consumers that do not
   * manage enablement. An array is authoritative: anything unlisted stays inactive,
   * and removing a slug deactivates that plugin in place, without a reload.
   */
  enabledSlugs?: string[]
  /** Per-plugin configuration, keyed by slug. Reaches the plugin as `ctx.config`. */
  configs?: Record<string, Record<string, unknown>>
}

export function PluginHostProvider({
  children,
  plugins = INSTALLED_PLUGINS,
  enabledSlugs,
  configs,
}: PluginHostProviderProps) {
  const registry = React.useMemo(() => new PluginRegistry(), [])
  const host = React.useMemo(() => new PluginHost(registry), [registry])

  const [sources, setSources] = React.useState<PluginSource[] | null>(null)
  const [ready, setReady] = React.useState(false)

  // Both normalized to an identity derived from their content: the props arrive as
  // fresh literals from a fetch, and using them as effect deps directly would reload
  // every plugin on every render. The JSON round-trip also drops anything
  // non-serializable, which is correct — config originates as JSON.
  const enabledKey = React.useMemo(
    () => (enabledSlugs ? [...enabledSlugs].sort().join('\u0000') : null),
    [enabledSlugs],
  )
  const enabled = React.useMemo(
    () => (enabledKey === null ? null : new Set(enabledKey.split('\u0000'))),
    [enabledKey],
  )

  const configsKey = React.useMemo(() => (configs ? JSON.stringify(configs) : ''), [configs])
  const resolvedConfigs = React.useMemo<Record<string, Record<string, unknown>>>(
    () => (configsKey ? JSON.parse(configsKey) : {}),
    [configsKey],
  )

  // Resolve the list first: for runtime-loaded plugins that is a fetch plus a
  // dynamic import per bundle, so it cannot happen during render.
  React.useEffect(() => {
    let cancelled = false

    async function resolve() {
      try {
        const resolved = typeof plugins === 'function' ? await plugins() : plugins
        if (!cancelled) setSources(resolved)
      } catch (err) {
        // A plugin source that cannot be resolved must not take down the app.
        console.error('Failed to resolve the plugin list:', err)
        if (!cancelled) setSources([])
      }
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [plugins])

  // Reconcile: activate what should be running, deactivate what should not.
  // Runs again whenever enablement or config changes, so the plugins page can
  // toggle a plugin without a page reload.
  React.useEffect(() => {
    if (!sources) return
    let cancelled = false

    async function sync() {
      for (const { manifest, entry } of sources ?? []) {
        if (cancelled) return

        const slug = manifest?.slug
        if (typeof slug !== 'string' || !slug) {
          // Let the host reject it, so the failure is recorded. The entry is never
          // resolved: no point fetching a chunk for a plugin that cannot activate.
          await host.loadPlugin(manifest, { activate: () => {} }, {})
          continue
        }

        const shouldRun = enabled === null || enabled.has(slug)
        const isRunning = host.getStatus(slug) === 'active'

        if (shouldRun && !isRunning) {
          // Resolving the entry is what downloads a compiled-in plugin's chunk, so it
          // happens here rather than at module scope.
          try {
            await host.loadPlugin(manifest, await resolvePluginEntry(entry), resolvedConfigs[slug] ?? {})
          } catch (error) {
            // A chunk that fails to load must not stop the plugins after it.
            console.error(`Failed to load plugin "${slug}":`, error)
          }
        } else if (!shouldRun && isRunning) {
          await host.unloadPlugin(slug)
        }
      }

      if (!cancelled) setReady(true)
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [sources, host, enabled, resolvedConfigs])

  const value = React.useMemo(
    () => ({ registry, host, ready, configs: resolvedConfigs }),
    [registry, host, ready, resolvedConfigs],
  )

  return (
    <PluginHostContext.Provider value={value}>
      {children}
    </PluginHostContext.Provider>
  )
}

export function usePluginRegistry(): PluginRegistry {
  const context = React.useContext(PluginHostContext)
  if (!context) {
    throw new Error('usePluginRegistry must be used within PluginHostProvider')
  }
  return context.registry
}

export function usePluginsReady(): boolean {
  const context = React.useContext(PluginHostContext)
  return context?.ready ?? false
}

/** The host itself. Only the plugins page needs this; capability consumers do not. */
export function usePluginHost(): PluginHost | null {
  return React.useContext(PluginHostContext)?.host ?? null
}

/**
 * Every plugin's configuration, keyed by slug, for capability hosts to pass into
 * `PluginScopeProvider`. Plugins use `usePluginConfig()` from the SDK instead — a plugin
 * component importing this module puts `installed.ts` and the host in a cycle.
 */
export function usePluginConfigs(): Record<string, Record<string, unknown>> {
  return React.useContext(PluginHostContext)?.configs ?? EMPTY_CONFIGS
}

const EMPTY_CONFIGS: Record<string, Record<string, unknown>> = {}

export type PluginContribution<K extends keyof CapabilityRegistry> =
  CapabilityRegistry[K] & { pluginId: string }

/**
 * Read a capability's contributions and re-render when they change — the one way a host
 * component should consume the registry. `registry.getAll()` during render only works
 * when plugins load before first paint; a runtime-loaded plugin registers after the
 * consumer rendered, with nothing to tell it to look again.
 */
export function usePluginContributions<K extends keyof CapabilityRegistry>(
  key: K,
): PluginContribution<K>[] {
  const registry = usePluginRegistry()

  const subscribe = React.useCallback(
    (onStoreChange: () => void) => registry.subscribe(onStoreChange),
    [registry],
  )

  // Copy-on-write in the registry makes this a stable reference between changes, which is
  // what lets useSyncExternalStore skip consumers of untouched capabilities.
  const getSnapshot = React.useCallback(
    () => registry.getAll(key) as unknown as PluginContribution<K>[],
    [registry, key],
  )

  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
