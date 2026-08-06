'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

interface PluginScope {
  pluginId: string
  config: Record<string, unknown>
}

const PluginScopeContext = React.createContext<PluginScope | null>(null)

/**
 * Names the plugin that owns the subtree, and carries its configuration.
 *
 * Every capability host wraps the components it renders from the registry in one
 * of these. It is what lets SDK hooks be scoped without the plugin passing its own
 * id around: `usePluginStore()` reads the namespace from here, `usePluginConfig()`
 * reads the settings, and `usePluginTranslations()` resolves its message prefix
 * the same way.
 *
 * `pluginId` comes from the registry entry, where the host set it itself — never
 * from anything the plugin supplied.
 *
 * This module deliberately holds no reference to the plugin host or to
 * `installed.ts`. Plugin components import from here (through the SDK), and
 * `installed.ts` imports plugin components — so anything they can reach must not
 * reach back, or the module graph becomes a cycle and the bindings are undefined
 * by the time a plugin renders.
 */
export function PluginScopeProvider({
  pluginId,
  config,
  children,
}: {
  pluginId: string
  config?: Record<string, unknown>
  children: React.ReactNode
}) {
  const value = React.useMemo(
    () => ({ pluginId, config: config ?? {} }),
    [pluginId, config],
  )

  return (
    <PluginScopeContext.Provider value={value}>
      {children}
    </PluginScopeContext.Provider>
  )
}

/**
 * The owning plugin's id. Throws outside a plugin subtree, because every caller is
 * an SDK hook that needs a namespace — silently falling back to a shared one would
 * mix plugins' data together.
 */
export function usePluginId(): string {
  return usePluginScope().pluginId
}

/**
 * The plugin's configuration for this organization, layered with any per-user
 * overrides. Shape is whatever the manifest's `configSchema` describes.
 */
export function usePluginConfig<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): T {
  return usePluginScope().config as T
}

function usePluginScope(): PluginScope {
  const scope = React.useContext(PluginScopeContext)
  if (scope === null) {
    throw new Error(
      'This hook is only available inside a plugin component. It must be rendered by a plugin capability host, which supplies the plugin scope.',
    )
  }
  return scope
}
