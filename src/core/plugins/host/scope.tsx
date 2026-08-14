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
 * Names the plugin that owns the subtree, and carries its configuration. Every
 * capability host wraps what it renders from the registry in one of these, which is
 * how the SDK hooks are scoped without a plugin passing its own id around.
 * `pluginId` comes from the registry entry, never from the plugin.
 *
 * Holds no reference to the host or `installed.ts`: plugin components import from
 * here and `installed.ts` imports plugin components, so reaching back would make the
 * module graph a cycle and leave the bindings undefined at render time.
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

/** The owning plugin's id. Throws outside a plugin subtree: a shared fallback would mix plugins' data. */
export function usePluginId(): string {
  return usePluginScope().pluginId
}

/** The org's config for this plugin, layered with per-user overrides. Shaped by the manifest's `configSchema`. */
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
