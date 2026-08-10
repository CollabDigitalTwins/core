'use client'

import useSWR from 'swr'

import type { PluginManifest } from '../../../../plugins/sdk/types'

/** A plugin found on the server's filesystem, not necessarily added or running. */
export interface MountedPlugin {
  manifest: PluginManifest
  bundleUrl: string
  /** Shown to an administrator before they add it, so they can see what they are trusting. */
  mountPath: string
}

interface MountedResponse {
  mountedPlugins?: MountedPlugin[]
  enabled?: boolean
}

/**
 * Plugins mounted into the running deployment.
 *
 * Fetched directly rather than through `ApiAdapter`, deliberately. The adapter is
 * the seam for *domain* data that any backend must provide; mounted plugins are a
 * property of one deployment's filesystem, and an `ApiAdapter` implementation
 * without a filesystem — a test double, a different server — has nothing sensible
 * to return. An empty list is the correct answer everywhere else, and that is what
 * a failed or forbidden request yields here.
 *
 * `enabled` reports whether the deployment has runtime loading switched on at all,
 * so the page can distinguish "none mounted" from "not turned on".
 */
export function useMountedPlugins(): { mounted: MountedPlugin[]; enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useSWR<MountedResponse>(
    ['mountedPlugins'],
    async () => {
      const response = await fetch('/api/plugins/mounted')
      // A role without read access gets 403, and a deployment with loading off
      // returns an empty list. Neither is an error worth surfacing.
      if (!response.ok) return {}
      return (await response.json()) as MountedResponse
    },
    // The filesystem does not change while the page is open, and re-scanning on
    // every focus would be pointless work.
    { revalidateOnFocus: false },
  )

  return {
    mounted: data?.mountedPlugins ?? [],
    enabled: data?.enabled ?? false,
    isLoading,
  }
}
