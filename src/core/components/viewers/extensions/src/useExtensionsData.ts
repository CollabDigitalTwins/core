'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginActions, usePluginInstallations, usePluginUserSettings } from '../../../../hooks/plugins/plugins'
import { usePluginHost, usePluginsReady } from '../../../../plugins/host/provider'
import { PLUGIN_MANIFESTS } from '../../../../plugins/manifests'

import { useMountedPlugins } from './useMountedPlugins'

import type { PluginInstallation, PluginUserSetting } from '../../../../types/plugins'
import type { ExtensionListing, ExtensionsActions } from '../types'

/**
 * Everything the extensions page needs, from the database.
 *
 * The page cannot be handed props: core's `Viewer` renders it with none. It
 * therefore reads through the same `ApiAdapter` port every other domain uses, so
 * the app supplies the data without any prop threading — which is exactly what
 * that seam is for.
 *
 * Four sources are crossed here:
 *
 * 1. **Manifests** — what plugins this build knows about, and their names,
 *    versions and capabilities. Read from `manifests.ts`, not `installed.ts`, so
 *    this does not drag plugin components in.
 * 2. **Mounted plugins** — what the deployment found on disk. Empty everywhere
 *    runtime loading is off, which is the default.
 * 3. **`PluginInstallation`** — what the organization admitted, and its defaults.
 * 4. **`PluginUserSetting`** — what this user chose.
 *
 * A manifest with no install row shows as `available`: present in the build,
 * not yet added here. An install row with no manifest is dropped — it names a
 * plugin this build does not have, which is normal after a downgrade.
 */
export function useExtensionsData(override?: ExtensionListing[]): {
  listings: ExtensionListing[]
  isLoading: boolean
} {
  const { installations, isLoading: loadingInstalls } = usePluginInstallations()
  const { userSettings, isLoading: loadingSettings } = usePluginUserSettings()
  const { mounted } = useMountedPlugins()

  const host = usePluginHost()
  // Statuses only mean anything once loading has finished; this also re-derives
  // the list when a plugin finishes activating.
  const ready = usePluginsReady()

  const listings = React.useMemo(() => {
    if (override) return override

    const byPlugin = new Map(installations.map(row => [row.pluginId, row]))
    const settingsByPlugin = new Map(userSettings.map(row => [row.pluginId, row]))
    const statuses = new Map(host?.listPlugins().map(entry => [entry.slug, entry]) ?? [])

    // Compiled-in plugins first, then anything mounted that is not also compiled
    // in. A slug can only appear once: the server's scan refuses a folder whose
    // manifest declares a different slug, so the two sets cannot disagree about
    // what a slug means.
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
      } satisfies ExtensionListing
    })
  }, [override, installations, userSettings, mounted, host, ready])

  return { listings, isLoading: loadingInstalls || loadingSettings }
}

/**
 * The writes, bound to the API.
 *
 * Shaped to the page's `ExtensionsActions` port so the component stays testable
 * with a stub, and so a future consumer (the runtime loader) can supply its own.
 */
export function useExtensionsActions(override?: ExtensionsActions): ExtensionsActions {
  const actions = usePluginActions()

  return React.useMemo<ExtensionsActions>(() => override ?? {
    setInstalled: async (pluginId, installed) => {
      if (installed) {
        // Adding a plugin turns it on for the organization in the same step:
        // an admin who adds something and finds it inert would reasonably call
        // that a bug.
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
