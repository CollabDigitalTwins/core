// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import useSWR, { mutate } from 'swr'

import type { PluginInstallation, PluginUserSetting } from '../../types/plugins'
import type { ApiAdapter } from '../ports/apiAdapter'

const INSTALLATIONS = ['pluginInstallations'] as const
const USER_SETTINGS = ['pluginUserSettings'] as const

/**
 * Enablement state for the extensions page.
 *
 * Both lists are small — bounded by the number of plugins a deployment has — so
 * they are fetched whole and mutated by revalidation rather than by patching the
 * cache. The page applies its own optimistic override on top, so the switch does
 * not wait for the round trip.
 *
 * Writes are plain async functions, not `useSWRMutation`: every one of them is a
 * per-plugin upsert triggered from a switch, and the mutation-hook-per-key shape
 * the other domains use would mean one hook per plugin per control.
 */
export function createPluginHooks(adapter: ApiAdapter) {
  const usePluginInstallations = () => {
    const { data, error, isLoading } = useSWR<PluginInstallation[]>(
      INSTALLATIONS,
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

  /**
   * The writes, each revalidating the list it changed.
   *
   * Deliberately not wrapped in a hook: the extensions page hands these straight
   * to its `ExtensionsActions` port, and they are called from event handlers
   * rather than during render.
   */
  const pluginActions = {
    async setInstallation(pluginId: string, patch: Partial<PluginInstallation>) {
      await adapter.upsertPluginInstallation(pluginId, patch)
      await mutate(INSTALLATIONS)
    },
    async removeInstallation(pluginId: string) {
      await adapter.deletePluginInstallation(pluginId)
      await mutate(INSTALLATIONS)
    },
    async setUserSetting(pluginId: string, patch: Partial<PluginUserSetting>) {
      await adapter.upsertPluginUserSetting(pluginId, patch)
      await mutate(USER_SETTINGS)
    },
  }

  return { usePluginInstallations, usePluginUserSettings, pluginActions }
}
