'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { pluginStateStore } from '../host/pluginState'
import { usePluginId } from '../host/scope'

/**
 * Shared state for one plugin's surfaces, in memory and scoped to the calling plugin.
 *
 * Use it when a map tool, a sidebar tab, a data page and a dialog from the same plugin need
 * to agree on something — a selection, a filter, a draft — that has no business reaching the
 * database. `usePluginStore` is the persisted counterpart; reach for that when the value
 * should survive a reload.
 *
 * The value is gone when the plugin is disabled or the tab closes. Two plugins using the
 * same key never see each other's value: the key is scoped by the plugin id the host
 * established, which a plugin cannot set.
 */
export function usePluginState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((previous: T) => T)) => void] {
  const pluginId = usePluginId()

  // Held in a ref so `getSnapshot` keeps one identity across renders. A fresh object literal
  // as `initial` would otherwise return a new value every call, which useSyncExternalStore
  // treats as a change and loops on.
  const initialRef = React.useRef(initial)

  const subscribe = React.useCallback(
    (listener: () => void) => pluginStateStore.subscribe(pluginId, key, listener),
    [pluginId, key],
  )

  const getSnapshot = React.useCallback(
    () => pluginStateStore.get(pluginId, key, initialRef.current),
    [pluginId, key],
  )

  const value = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const setValue = React.useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = pluginStateStore.get(pluginId, key, initialRef.current)
      const resolved = typeof next === 'function'
        ? (next as (previous: T) => T)(previous)
        : next

      pluginStateStore.set(pluginId, key, resolved)
    },
    [pluginId, key],
  )

  return [value, setValue]
}
