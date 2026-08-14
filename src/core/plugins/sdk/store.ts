'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useCoreHooks } from '../../hooks/provider'
import { usePluginId } from '../host/scope'

/** One stored document, as the owning plugin sees it. */
export interface PluginDocument<T> {
  /** The plugin's own stable identifier for this document. */
  key: string
  data: T
  updatedAt: string | Date
}

export interface PluginStore<T> {
  items: PluginDocument<T>[]
  isLoading: boolean
  isError: unknown
  /** One document by key, or undefined. */
  get: (key: string) => PluginDocument<T> | undefined
  /** Create or replace a document. Keyed writes are upserts, not appends. */
  put: (key: string, data: T) => Promise<void>
  remove: (key: string) => Promise<void>
}

/**
 * Storage a plugin owns, without a change to CDT's database.
 *
 * Scoped by organization (from the session, server-side), by plugin (from the plugin
 * scope, never a parameter, so no plugin can name another's namespace) and by
 * collection, which the plugin picks. `key` is the plugin's own identifier — use
 * something durable like an IFC GlobalId, since writing the same key replaces.
 *
 * ```tsx
 * const spaces = usePluginStore<{ programme: string; capacity: number }>('spaces')
 * await spaces.put(globalId, { programme: 'Office', capacity: 4 })
 * ```
 *
 * Core never inspects `data`, so `T` is a declaration rather than a guarantee —
 * read defensively if an older version of the plugin wrote a different shape.
 */
export function usePluginStore<T = unknown>(collection: string): PluginStore<T> {
  const pluginId = usePluginId()
  const { plugin } = useCoreHooks()

  const { records, isLoading, isError, put, remove } = plugin.usePluginRecords(pluginId, collection)

  const items = React.useMemo<PluginDocument<T>[]>(
    () => records.map(record => ({
      key: record.key,
      data: record.data as T,
      updatedAt: record.updatedAt,
    })),
    [records],
  )

  const byKey = React.useMemo(
    () => new Map(items.map(item => [item.key, item])),
    [items],
  )

  return React.useMemo<PluginStore<T>>(() => ({
    items,
    isLoading,
    isError,
    get: key => byKey.get(key),
    put: async (key, data) => {
      await put(key, data)
    },
    remove: async key => {
      await remove(key)
    },
  }), [items, byKey, isLoading, isError, put, remove])
}
