'use client'

import * as React from 'react'
import { PluginRegistry } from './registry'
import { PluginHost } from './host'
import { INSTALLED_PLUGINS } from '../installed'

interface PluginHostContextValue {
  registry: PluginRegistry
  ready: boolean
}

const PluginHostContext = React.createContext<PluginHostContextValue | null>(null)

export function PluginHostProvider({ children }: { children: React.ReactNode }) {
  const registry = React.useMemo(() => new PluginRegistry(), [])
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const host = new PluginHost(registry)

    async function loadPlugins() {
      for (const { manifest, entry } of INSTALLED_PLUGINS) {
        await host.loadPlugin(manifest, entry, {})
      }
      setReady(true)
    }

    loadPlugins()
  }, [registry])

  // Memoize the value object. `registry` is already memoized above but the
  // surrounding value object was being recreated every render.
  const value = React.useMemo(() => ({ registry, ready }), [registry, ready])

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
