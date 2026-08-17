'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { stringToColour } from '../sdk'
import { useBimViewer } from '../sdk/bimViewer'
import { usePluginState } from '../sdk/state'
import { usePluginStore } from '../sdk/store'

import type { ModelIdMap } from '../sdk/bimViewer'

/** What the plugin stores about one space. The IFC model itself is never written to. */
export interface SpaceAnnotation extends Record<string, unknown> {
  /** Replaces the IFC name in this plugin's own surfaces. */
  name: string
  colour: string
}

export interface Space {
  /** `<modelId>::<localId>` — stable for as long as the model is, and safe as a record key. */
  key: string
  modelId: string
  localId: number
  /** From the IFC, and never changed. */
  ifcName: string
  /** The annotation's name when there is one, otherwise the IFC's. */
  name: string
  colour: string
  /** Whether the plugin has stored anything for this space. */
  annotated: boolean
}

export function spaceKey(modelId: string, localId: number): string {
  return `${modelId}::${localId}`
}

/** Back to the `ModelIdMap` the BIM SDK takes, for select, isolate and paint. */
export function toModelIdMap(spaces: Space[]): ModelIdMap {
  const items: ModelIdMap = {}
  for (const space of spaces) {
    (items[space.modelId] ??= []).push(space.localId)
  }
  return items
}

export interface DiscoveredSpace {
  modelId: string
  localId: number
  ifcName: string
}

/**
 * Finds the model's IfcSpaces once per set of loaded models, and shares the result with
 * every surface of this plugin.
 *
 * Each surface calls this, but only one scan runs: the scan key is claimed in plugin state
 * before the async work starts, and that state is shared, so whichever surface renders first
 * does the query and the rest read its result. Without that, the toolbar panel, the sidebar
 * tab and the legend would each query the model.
 */
export function useSpaceDiscovery(): { discovered: DiscoveredSpace[]; scanning: boolean } {
  const { components, modelIds, getItemsOfCategory, getProperties } = useBimViewer()
  const [discovered, setDiscovered] = usePluginState<DiscoveredSpace[]>('discovered', [])
  const [scannedFor, setScannedFor] = usePluginState<string | null>('scannedFor', null)

  // Identity of the loaded set, so unloading a model rescans and a re-render does not.
  const modelKey = modelIds.join('|')

  React.useEffect(() => {
    if (!components || modelKey === scannedFor) return

    // Claimed before awaiting, so a second surface rendering in the same tick does not
    // start its own scan.
    setScannedFor(modelKey)

    if (modelIds.length === 0) {
      setDiscovered([])
      return
    }

    let cancelled = false

    const scan = async () => {
      const items = await getItemsOfCategory('IFCSPACE')
      const properties = await getProperties(items, ['Name', 'LongName'])
      if (cancelled) return

      setDiscovered(properties.map(entry => ({
        modelId: entry.modelId,
        localId: entry.localId,
        ifcName: readName(entry) ?? `Space ${entry.localId}`,
      })))
    }

    void scan().catch((error) => {
      console.error('[hello-bim] could not read the model\'s spaces:', error)
      // Released so a later render tries again rather than sitting on an empty list.
      if (!cancelled) setScannedFor(null)
    })

    return () => {
      cancelled = true
    }
  }, [components, modelKey, modelIds, scannedFor, getItemsOfCategory, getProperties, setDiscovered, setScannedFor])

  return { discovered, scanning: components !== null && modelKey !== scannedFor }
}

/** IFC attributes arrive either as a bare string or wrapped in `{ value }`, depending on the model. */
function readName(entry: Record<string, unknown>): string | null {
  for (const key of ['LongName', 'Name']) {
    const raw = entry[key]
    if (typeof raw === 'string' && raw.trim()) return raw.trim()

    if (raw && typeof raw === 'object' && 'value' in raw) {
      const value = (raw as { value: unknown }).value
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  }
  return null
}

/**
 * The spaces this plugin knows about, and what it has stored against them.
 *
 * The IFC is read-only geometry — a "rename" cannot write back to the model, so a name is an
 * annotation this plugin owns and displays. Annotations are records, because they belong to
 * the organization and should outlive the session; which space is selected is `usePluginState`,
 * because it does not.
 */
export function useSpaces() {
  const { discovered, scanning } = useSpaceDiscovery()
  const store = usePluginStore<SpaceAnnotation>('spaces')
  const [selectedKey, setSelectedKey] = usePluginState<string | null>('selected', null)
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
        console.error('[hello-bim] save failed:', error)
        setLastError(message)
        return false
      }
    },
    [setLastError],
  )

  const annotations = React.useMemo(
    () => new Map(store.items.map(item => [item.key, item.data])),
    [store.items],
  )

  const spaces = React.useMemo<Space[]>(
    () => discovered.map((found) => {
      const key = spaceKey(found.modelId, found.localId)
      const annotation = annotations.get(key)

      return {
        key,
        modelId: found.modelId,
        localId: found.localId,
        ifcName: found.ifcName,
        name: annotation?.name ?? found.ifcName,
        // A colour before anyone picks one, so the legend and the model are readable from
        // the first render. Hashed, so it is stable per space rather than shuffling.
        colour: annotation?.colour ?? stringToColour(key),
        annotated: annotation !== undefined,
      }
    }),
    [discovered, annotations],
  )

  const byKey = React.useMemo(
    () => new Map(spaces.map(space => [space.key, space])),
    [spaces],
  )

  /** One edit path, so a field added to the annotation cannot be dropped by a rename. */
  const patch = React.useCallback(
    async (key: string, changes: Partial<SpaceAnnotation>) => {
      const current = byKey.get(key)
      if (!current) return

      await attempt(() => store.put(key, {
        name: current.name,
        colour: current.colour,
        ...changes,
      }))
    },
    [store, byKey, attempt],
  )

  const rename = React.useCallback(
    async (key: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed || trimmed === byKey.get(key)?.name) return
      await patch(key, { name: trimmed })
    },
    [patch, byKey],
  )

  const setColour = React.useCallback(
    (key: string, colour: string) => patch(key, { colour }),
    [patch],
  )

  /** Drops the annotation, so the space goes back to its IFC name and a hashed colour. */
  const reset = React.useCallback(
    async (key: string) => {
      if (!byKey.get(key)?.annotated) return
      await attempt(() => store.remove(key))
    },
    [store, byKey, attempt],
  )

  return {
    spaces,
    isLoading: store.isLoading || scanning,
    lastError,
    selected: selectedKey === null ? null : byKey.get(selectedKey) ?? null,
    select: setSelectedKey,
    rename,
    setColour,
    reset,
  }
}
