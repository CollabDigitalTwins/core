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
 * Storage a plugin owns.
 *
 * A place to keep a plugin's own data — a room inventory, a set of annotations —
 * without needing a change to CDT's database. Documents are scoped three ways:
 *
 * - **By organization**, from the session on the server. A plugin cannot read
 *   another tenant's data, and does not pass an organization id to try.
 * - **By plugin**, from the plugin scope its capability host established. The
 *   `pluginId` is not a parameter, so a plugin cannot name someone else's
 *   namespace even by accident.
 * - **By collection**, which the plugin chooses — its own equivalent of a table.
 *
 * Within that, `key` is the plugin's own stable identifier. Use something
 * meaningful and durable — an IFC GlobalId rather than an array index — because
 * writing to the same key replaces the document rather than adding another.
 *
 * ```tsx
 * const spaces = usePluginStore<{ programme: string; capacity: number }>('spaces')
 *
 * await spaces.put(globalId, { programme: 'Office', capacity: 4 })
 * const room = spaces.get(globalId)
 * ```
 *
 * `data` is whatever you put in it; core never inspects it. `T` is your
 * declaration of that shape, not a guarantee — a document written by an older
 * version of your plugin is still whatever it was, so treat reads defensively if
 * the shape has changed.
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
