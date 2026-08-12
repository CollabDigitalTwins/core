'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

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

// Plugins mounted into the running deployment.
//
// Fetched directly rather than through `ApiAdapter`: the adapter is the seam for *domain*
// data any backend must provide, and mounted plugins are a property of one deployment's
// filesystem, so an implementation without one has nothing sensible to return. An empty
// list is the correct answer everywhere else, which is what a failed request yields here.
//
// `enabled` lets the page tell "none mounted" from "runtime loading not turned on".
export function useMountedPlugins(): { mounted: MountedPlugin[]; enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useSWR<MountedResponse>(
    ['mountedPlugins'],
    async () => {
      const response = await fetch('/api/plugins/mounted')
      // A role without read access gets 403; neither that nor a deployment with loading
      // off is an error worth surfacing.
      if (!response.ok) return {}
      return (await response.json()) as MountedResponse
    },
    // The filesystem does not change while the page is open.
    { revalidateOnFocus: false },
  )

  return {
    mounted: data?.mountedPlugins ?? [],
    enabled: data?.enabled ?? false,
    isLoading,
  }
}
