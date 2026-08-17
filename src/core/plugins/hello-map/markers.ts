'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { stringToColour } from '../sdk'
import { usePluginState } from '../sdk/state'
import { usePluginStore } from '../sdk/store'

export interface MarkerData extends Record<string, unknown> {
  name: string
  latitude: number
  longitude: number
  /** The zoom the marker was recorded at, so flying back restores the same view. */
  zoom: number
  colour: string
}

export interface Marker extends MarkerData {
  key: string
}

/** Used when a record was written before `zoom` existed — `T` is a declaration, not a guarantee. */
export const DEFAULT_ZOOM = 15

/** One edit path, so a field added to `MarkerData` cannot be dropped by a rename. */
function toData({ key: _key, ...data }: Marker): MarkerData {
  return data
}

/** Unique without a counter to keep, so two quick clicks cannot collide. */
function nextKey(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Everything every surface reads. Markers are records, so they survive a reload; the selection
 * and the open popup are session state, so they do not belong in the database.
 */
export function useMarkers() {
  const store = usePluginStore<MarkerData>('markers')
  const [selectedKey, setSelectedKey] = usePluginState<string | null>('selected', null)
  const [openKey, setOpenKey] = usePluginState<string | null>('open', null)
  // Every write goes through `attempt`, or a rejected save looks like a dead button.
  const [lastError, setLastError] = usePluginState<string | null>('lastError', null)

  const attempt = React.useCallback(
    async (action: () => Promise<void>) => {
      try {
        await action()
        setLastError(null)
        return true
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('[hello-map] save failed:', error)
        setLastError(message)
        return false
      }
    },
    [setLastError],
  )

  const markers = React.useMemo<Marker[]>(
    () => store.items.map(item => ({
      key: item.key,
      ...item.data,
      // Records written before `zoom` existed have none, and flyTo would get NaN.
      zoom: typeof item.data.zoom === 'number' ? item.data.zoom : DEFAULT_ZOOM,
    })),
    [store.items],
  )

  const byKey = React.useMemo(
    () => new Map(markers.map(marker => [marker.key, marker])),
    [markers],
  )

  const add = React.useCallback(
    async (latitude: number, longitude: number, zoom: number) => {
      const key = nextKey()

      // A palette colour, so a page of markers stays readable and colourblind-safe.
      const saved = await attempt(() => store.put(key, {
        name: `Marker ${store.items.length + 1}`,
        latitude,
        longitude,
        zoom,
        colour: stringToColour(key),
      }))

      if (saved) setSelectedKey(key)
      return saved ? key : null
    },
    [store, setSelectedKey, attempt],
  )

  /** One edit path, so a field added to `MarkerData` cannot be dropped by a rename. */
  const patch = React.useCallback(
    async (key: string, changes: Partial<MarkerData>) => {
      const current = byKey.get(key)
      if (!current) return

      await attempt(() => store.put(key, { ...toData(current), ...changes }))
    },
    [store, byKey, attempt],
  )

  const setColour = React.useCallback(
    (key: string, colour: string) => patch(key, { colour }),
    [patch],
  )

  const rename = React.useCallback(
    async (key: string, name: string) => {
      const trimmed = name.trim()
      // An empty name would leave an unlabelled row and legend entry.
      if (!trimmed || trimmed === byKey.get(key)?.name) return

      await patch(key, { name: trimmed })
    },
    [patch, byKey],
  )

  const remove = React.useCallback(
    async (key: string) => {
      const removed = await attempt(() => store.remove(key))
      if (!removed) return

      setSelectedKey(current => (current === key ? null : current))
      setOpenKey(current => (current === key ? null : current))
    },
    [store, setSelectedKey, setOpenKey, attempt],
  )

  return {
    markers,
    isLoading: store.isLoading,
    /** The last write that failed, or null. Shown by the tool and the tab. */
    lastError,
    selected: selectedKey === null ? null : byKey.get(selectedKey) ?? null,
    openMarker: openKey === null ? null : byKey.get(openKey) ?? null,
    select: setSelectedKey,
    open: setOpenKey,
    add,
    setColour,
    rename,
    remove,
  }
}
