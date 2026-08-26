'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { stringToColour } from '@collabdt/core/plugins-sdk'
import { usePluginBimAppearance, useBimViewer } from '@collabdt/core/plugins-sdk/bimViewer'
import { usePluginState } from '@collabdt/core/plugins-sdk/state'
import { usePluginStore } from '@collabdt/core/plugins-sdk/store'

import type { ModelIdMap } from '@collabdt/plugin-kit/types/bim'

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

/** Sets, not arrays: `ModelIdMap` is `Record<string, Set<number>>`. */
export function toModelIdMap(spaces: Space[]): ModelIdMap {
  const items: ModelIdMap = {}
  for (const space of spaces) {
    (items[space.modelId] ??= new Set<number>()).add(space.localId)
  }
  return items
}

export interface DiscoveredSpace {
  modelId: string
  localId: number
  ifcName: string
}

// Module scope, not plugin state: a state claim is an effect dep, so it cancels its own scan.
const scans = new Map<string, Promise<DiscoveredSpace[]>>()

export function useSpaceDiscovery(): { discovered: DiscoveredSpace[]; scanning: boolean } {
  const { components, modelIds, getItemsOfCategory, getProperties } = useBimViewer()
  const [discovered, setDiscovered] = usePluginState<DiscoveredSpace[]>('discovered', [])
  const [scannedFor, setScannedFor] = usePluginState<string | null>('scannedFor', null)

  const modelKey = modelIds.join('|')

  React.useEffect(() => {
    if (!components || modelKey === scannedFor) return

    if (modelIds.length === 0) {
      setDiscovered([])
      setScannedFor(modelKey)
      return
    }

    let cancelled = false

    const scan = scans.get(modelKey) ?? (async () => {
      const items = await getItemsOfCategory('IFCSPACE')
      const properties = await getProperties(items, ['Name', 'LongName'])

      return properties.map(entry => ({
        modelId: entry.modelId,
        localId: entry.localId,
        ifcName: readName(entry) ?? `Space ${entry.localId}`,
      }))
    })()

    scans.set(modelKey, scan)

    void scan
      .then((found) => {
        if (cancelled) return
        setDiscovered(found)
        // Only once there is a result, or a cancelled surface marks it looked-at.
        setScannedFor(modelKey)
      })
      .catch((error) => {
        console.error('[hello-bim] could not read the model\'s spaces:', error)
        scans.delete(modelKey)
      })

    return () => {
      cancelled = true
    }
  }, [components, modelKey, modelIds, scannedFor, getItemsOfCategory, getProperties, setDiscovered, setScannedFor])

  return { discovered, scanning: components !== null && modelKey !== scannedFor }
}

/** IFC attributes arrive bare or wrapped in `{ value }`, depending on the model. */
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
 * The spaces, plus the annotations this plugin stores against them. The IFC is read-only, so
 * a rename is an annotation, never a write to the model.
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
        // Hashed, so an unpicked colour is stable per space rather than shuffling.
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

/**
 * Whether the spaces are painted, applied from an effect so a recolour repaints at once.
 * The flag is plugin state, so the toolbar and the tab agree on it.
 */
export function useSpacePainting() {
  const { spaces } = useSpaces()
  const { setItemsVisible } = useBimViewer()
  const { setAppearance, clearAppearance } = usePluginBimAppearance()
  const [painted, setPainted] = usePluginState('painted', false)

  React.useEffect(() => {
    if (!painted) {
      clearAppearance()
      return
    }
    if (spaces.length === 0) return

    // IfcSpaces start hidden, so painting them without this colours nothing visible.
    void setItemsVisible(toModelIdMap(spaces), true)

    setAppearance(spaces.map(space => ({
      items: toModelIdMap([space]),
      appearance: { color: hexToInt(space.colour) },
    })))
  }, [painted, spaces, setAppearance, clearAppearance, setItemsVisible])

  return { painted, setPainted }
}

/** `#rrggbb` to the `0xRRGGBB` the appearance API takes. */
export function hexToInt(colour: string): number {
  return Number.parseInt(colour.replace('#', ''), 16)
}
