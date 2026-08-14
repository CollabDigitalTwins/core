'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginActions, usePluginInstallations, usePluginUserSettings } from '../../../../hooks/plugins/plugins'
import { usePluginHost, usePluginsReady } from '../../../../plugins/host/provider'
import { PLUGIN_MANIFESTS } from '../../../../plugins/manifests'

import { useMountedPlugins } from './useMountedPlugins'

import type { PluginInstallation, PluginUserSetting } from '../../../../types/plugins'
import type { PluginListing, PluginsActions } from '../types'

/**
 * Everything the plugins page needs. Core's `Viewer` renders the page with no
 * props, so it reads through the same `ApiAdapter` port every other domain uses.
 *
 * Four sources cross here: the manifests this build knows about (from
 * `manifests.ts`, not `installed.ts`, so plugin components stay out), whatever the
 * deployment mounted on disk, `PluginInstallation` for the org and
 * `PluginUserSetting` for this user.
 *
 * A manifest with no install row shows as `available`. An install row with no
 * manifest is dropped — normal after a downgrade.
 */
export function usePluginsData(override?: PluginListing[]): {
  listings: PluginListing[]
  isLoading: boolean
} {
  const { installations, isLoading: loadingInstalls } = usePluginInstallations()
  const { userSettings, isLoading: loadingSettings } = usePluginUserSettings()
  const { mounted } = useMountedPlugins()

  const host = usePluginHost()
  // Statuses only mean anything once loading finishes, and this re-derives the list
  // when a plugin finishes activating.
  const ready = usePluginsReady()

  const listings = React.useMemo(() => {
    if (override) return override

    const byPlugin = new Map(installations.map(row => [row.pluginId, row]))
    const settingsByPlugin = new Map(userSettings.map(row => [row.pluginId, row]))
    const statuses = new Map(host?.listPlugins().map(entry => [entry.slug, entry]) ?? [])

    // Compiled-in first, then anything mounted that is not. A slug appears once: the
    // server's scan refuses a folder whose manifest declares a different slug.
    const compiledSlugs = new Set(PLUGIN_MANIFESTS.map(manifest => manifest.slug))
    const sources = [
      ...PLUGIN_MANIFESTS.map(manifest => ({ manifest, bundled: true, mountPath: undefined as string | undefined })),
      ...mounted
        .filter(entry => !compiledSlugs.has(entry.manifest.slug))
        .map(entry => ({ manifest: entry.manifest, bundled: false, mountPath: entry.mountPath })),
    ]

    return sources.map(({ manifest, bundled, mountPath }) => {
      const install = byPlugin.get(manifest.slug)
      const setting = settingsByPlugin.get(manifest.slug)
      const live = statuses.get(manifest.slug)

      return {
        manifest,
        status: live?.status === 'errored' ? 'error' : install ? 'off' : 'available',
        ...(live?.error ? { error: live.error } : {}),
        installed: Boolean(install),
        orgEnabled: install?.enabled ?? false,
        allowUserOverride: install?.allowUserOverride ?? true,
        userEnabled: setting ? setting.enabled : null,
        bundled,
        ...(mountPath ? { mountPath } : {}),
      } satisfies PluginListing
    })
  }, [override, installations, userSettings, mounted, host, ready])

  return { listings, isLoading: loadingInstalls || loadingSettings }
}

/** The writes, bound to the API, shaped to the page's `PluginsActions` port. */
export function usePluginsActions(override?: PluginsActions): PluginsActions {
  const actions = usePluginActions()

  return React.useMemo<PluginsActions>(() => override ?? {
    setInstalled: async (pluginId, installed) => {
      if (installed) {
        // Adding turns it on in the same step: an admin who adds something and finds
        // it inert would reasonably call that a bug.
        await actions.setInstallation(pluginId, { enabled: true })
      } else {
        await actions.removeInstallation(pluginId)
      }
    },
    setOrgEnabled: (pluginId, enabled) => actions.setInstallation(pluginId, { enabled }),
    setAllowUserOverride: (pluginId, allowUserOverride) =>
      actions.setInstallation(pluginId, { allowUserOverride }),
    setUserEnabled: (pluginId, enabled) => actions.setUserSetting(pluginId, { enabled }),
  }, [override, actions])
}

export type { PluginInstallation, PluginUserSetting }
