'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { pluginStateStore } from '../host/pluginState'
import { usePluginId } from '../host/scope'

/**
 * Shared state for one plugin's surfaces: in memory, scoped to the plugin, gone when it is
 * disabled. `usePluginStore` is the persisted counterpart.
 */
export function usePluginState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((previous: T) => T)) => void] {
  const pluginId = usePluginId()

  // In a ref, or a fresh `initial` literal makes getSnapshot loop.
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
