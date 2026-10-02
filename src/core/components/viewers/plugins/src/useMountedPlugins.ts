'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import useSWR from 'swr'

import type { PluginManifest } from '../../../../plugins/sdk/types'

/** A plugin found on the server's filesystem, not necessarily added or running. */
export interface MountedPlugin {
  manifest: PluginManifest
  bundleUrl: string
  /** Shown to an administrator before they add it, so they can see what they are trusting. Absent for registry plugins. */
  mountPath?: string
  source?: 'mounted' | 'registry'
  /** The registry version granted to this organization, when `source` is `registry`. */
  registryVersion?: string
}

interface MountedResponse {
  mountedPlugins?: MountedPlugin[]
  enabled?: boolean
}

// Plugins mounted into the running deployment. Fetched directly rather than through
// `ApiAdapter`, which is the seam for domain data every backend must provide — a
// deployment with no filesystem of plugins has nothing sensible to return, and the
// empty list a failed request yields here is the right answer for it.
//
// `enabled` tells "none mounted" from "runtime loading not turned on".
export function useMountedPlugins(): {
  mounted: MountedPlugin[]
  enabled: boolean
  isLoading: boolean
  refresh: () => Promise<MountedPlugin[]>
} {
  const { data, isLoading, mutate } = useSWR<MountedResponse>(
    ['mountedPlugins'],
    async () => {
      const response = await fetch('/api/plugins/mounted')
      // A 403 for a role without read access is not worth surfacing.
      if (!response.ok) return {}
      return (await response.json()) as MountedResponse
    },
    // The filesystem does not change while the page is open.
    { revalidateOnFocus: false },
  )

  const refresh = React.useCallback(async () => (await mutate())?.mountedPlugins ?? [], [mutate])

  return {
    mounted: data?.mountedPlugins ?? [],
    enabled: data?.enabled ?? false,
    isLoading,
    refresh,
  }
}
