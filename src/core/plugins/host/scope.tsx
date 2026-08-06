'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

const PluginScopeContext = React.createContext<string | null>(null)

/**
 * Names the plugin that owns the subtree.
 *
 * Every capability host wraps the components it renders from the registry in one
 * of these. It is what lets SDK hooks be scoped without the plugin passing its own
 * id around: `usePluginStore()` reads the namespace from here, so a plugin cannot
 * name someone else's, and `usePluginTranslations()` resolves its message prefix
 * the same way.
 *
 * The value comes from the registry entry, where the host set `pluginId` itself —
 * never from anything the plugin supplied.
 */
export function PluginScopeProvider({
  pluginId,
  children,
}: {
  pluginId: string
  children: React.ReactNode
}) {
  return (
    <PluginScopeContext.Provider value={pluginId}>
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
  const pluginId = React.useContext(PluginScopeContext)
  if (pluginId === null) {
    throw new Error(
      'This hook is only available inside a plugin component. It must be rendered by a plugin capability host, which supplies the plugin scope.',
    )
  }
  return pluginId
}
