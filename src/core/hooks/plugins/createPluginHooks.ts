// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import useSWR, { mutate } from 'swr'

import type { PluginInstallation, PluginRecord, PluginUserSetting } from '../../types/plugins'
import type { ApiAdapter } from '../ports/apiAdapter'

export const PLUGIN_INSTALLATIONS_KEY = ['pluginInstallations'] as const
const USER_SETTINGS = ['pluginUserSettings'] as const

/**
 * Enablement state for the plugins page. Both lists are bounded by the plugin count, so they are
 * fetched whole and revalidated; writes are plain async functions, not one `useSWRMutation` per plugin.
 */
export function createPluginHooks(adapter: ApiAdapter) {
  const usePluginInstallations = () => {
    const { data, error, isLoading } = useSWR<PluginInstallation[]>(
      PLUGIN_INSTALLATIONS_KEY,
      () => adapter.listPluginInstallations(),
    )

    return {
      installations: data ?? [],
      isLoading,
      isError: error,
    }
  }

  const usePluginUserSettings = () => {
    const { data, error, isLoading } = useSWR<PluginUserSetting[]>(
      USER_SETTINGS,
      () => adapter.listPluginUserSettings(),
    )

    return {
      userSettings: data ?? [],
      isLoading,
      isError: error,
    }
  }

  // Not a hook: the plugins page hands these to its `PluginsActions` port and calls them from event handlers.
  const pluginActions = {
    async setInstallation(pluginId: string, patch: Partial<PluginInstallation>) {
      await adapter.upsertPluginInstallation(pluginId, patch)
      await mutate(PLUGIN_INSTALLATIONS_KEY)
    },
    async removeInstallation(pluginId: string) {
      await adapter.deletePluginInstallation(pluginId)
      await mutate(PLUGIN_INSTALLATIONS_KEY)
    },
    async setUserSetting(pluginId: string, patch: Partial<PluginUserSetting>) {
      await adapter.upsertPluginUserSetting(pluginId, patch)
      await mutate(USER_SETTINGS)
    },
  }

  // `pluginId` comes from the plugin scope at the call site, never from the plugin itself.
  const usePluginRecords = (pluginId: string, collection: string) => {
    const key = pluginId && collection ? ['pluginRecords', pluginId, collection] as const : null

    const { data, error, isLoading } = useSWR<PluginRecord[]>(
      key,
      () => adapter.listPluginRecords(pluginId, collection),
    )

    const revalidate = () => (key ? mutate(key) : Promise.resolve())

    return {
      records: data ?? [],
      isLoading,
      isError: error,
      // Arrow properties, not method shorthand: callers destructure these and have no `this`.
      /** Create or replace one document. `key` is the plugin's own identifier. */
      put: async (recordKey: string, value: unknown) => {
        const saved = await adapter.putPluginRecord(pluginId, collection, recordKey, value)
        await revalidate()
        return saved
      },
      remove: async (recordKey: string) => {
        await adapter.deletePluginRecord(pluginId, collection, recordKey)
        await revalidate()
      },
    }
  }

  return { usePluginInstallations, usePluginUserSettings, usePluginRecords, pluginActions }
}
