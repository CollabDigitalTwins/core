'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { ElementAppearance } from '../../components/viewers/bim/src/ElementAppearance'
import { fitToSelection } from '../../components/viewers/bim/src/lib/bimCamera'
import {
  clearSelection,
  isolateItems,
  selectItems,
  setItemsVisible,
  showAllItems,
} from '../../components/viewers/bim/src/lib/bimItemActions'
import {
  getItemProperties,
  getItemsOfCategory,
} from '../../components/viewers/bim/src/lib/bimQueries'
import { BimContext } from '../../store/BIM/context'
import { usePluginId } from '../host/scope'

import type { BimItemProperties } from '../../components/viewers/bim/src/lib/bimQueries'
import type { ModelIdMap } from '../../components/viewers/bim/src/lib/bimTree'
import type * as OBC from '@thatopen/components'

/**
 * The BIM viewer, as a plugin sees it. Kept out of the `plugins-sdk` barrel: it depends on
 * `@thatopen/components` and three at runtime.
 */
export interface BimToolProps {
  components: OBC.Components | null
  world: OBC.World | null
  fragments: OBC.FragmentsManager | null
  /** Ids of every loaded model, in load order. */
  modelIds: string[]

  /** The live selection, keyed by model id. Updates as the user clicks in the viewport. */
  selection: ModelIdMap

  // Properties, not methods, so a plugin can destructure them safely.
  select: (items: ModelIdMap) => Promise<void>
  clearSelection: () => void
  /** Frame the camera on whatever is currently selected. */
  fitToSelection: () => Promise<void>

  /** Hides everything except `items`, across every loaded model. */
  isolate: (items: ModelIdMap) => Promise<void>
  setItemsVisible: (items: ModelIdMap, visible: boolean) => Promise<void>
  /** The escape hatch from `isolate`: makes everything visible again. */
  showAll: () => Promise<void>

  /**
   * Every element of one IFC class, e.g. `getItemsOfCategory('IFCSPACE')`. Spaces
   * start hidden, being volumetric, so showing them needs `setItemsVisible` too.
   */
  getItemsOfCategory: (category: string) => Promise<ModelIdMap>
  /** Attributes for the given elements. Omit `attributes` for the default set. */
  getProperties: (items: ModelIdMap, attributes?: string[]) => Promise<BimItemProperties[]>
}

/**
 * Thin façade over the `lib/bim*` helpers core itself uses. Colour lives in
 * {@link usePluginBimAppearance}, which knows the calling plugin; this cannot.
 */
export function useBimViewer(): BimToolProps {
  const { state } = React.useContext(BimContext)
  const { bimComponents, world, fragments, modelIds, selection } = state.bim

  return React.useMemo<BimToolProps>(() => ({
    components: bimComponents,
    world,
    fragments,
    modelIds,
    selection,

    select: async (items: ModelIdMap) => {
      if (bimComponents) await selectItems(bimComponents, items)
    },
    clearSelection: () => {
      if (bimComponents) clearSelection(bimComponents)
    },
    fitToSelection: async () => {
      if (bimComponents) await fitToSelection(bimComponents)
    },

    isolate: async (items: ModelIdMap) => {
      if (bimComponents) await isolateItems(bimComponents, items)
    },
    setItemsVisible: async (items: ModelIdMap, visible: boolean) => {
      if (bimComponents) await setItemsVisible(bimComponents, items, visible)
    },
    showAll: async () => {
      if (bimComponents) await showAllItems(bimComponents)
    },

    getItemsOfCategory: async (category: string) =>
      bimComponents ? getItemsOfCategory(bimComponents, category) : {},
    getProperties: async (items: ModelIdMap, attributes?: string[]) =>
      bimComponents ? getItemProperties(bimComponents, items, attributes) : [],
  }), [bimComponents, world, fragments, modelIds, selection])
}

export interface BimAppearance {
  /** `0xRRGGBB`. Omit to keep each element's own colour. */
  color?: number
  /** `0`–`1`. Omit to leave elements opaque. */
  opacity?: number
}

/** One appearance and the elements wearing it. */
export interface BimAppearanceGroup {
  items: ModelIdMap
  appearance: BimAppearance
}

export interface PluginBimAppearance {
  /**
   * Every group in one call, replacing this plugin's previous paint. Calling it per group
   * would replace that same entry each time and leave only the last. An empty list clears.
   */
  setAppearance: (groups: readonly BimAppearanceGroup[]) => void
  /** Gives this plugin's elements back their own colours. */
  clearAppearance: () => void
}

/**
 * Colour and opacity, bucketed into one `highlight()` per appearance — per element would
 * exhaust the model's ~65 500 material slots. Scoped to this plugin, outside the sidebar's undo.
 */
export function usePluginBimAppearance(): PluginBimAppearance {
  const pluginId = usePluginId()
  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim

  return React.useMemo<PluginBimAppearance>(() => ({
    setAppearance: (groups: readonly BimAppearanceGroup[]) => {
      bimComponents?.get(ElementAppearance).setElementAppearance(pluginId, groups)
    },
    clearAppearance: () => {
      bimComponents?.get(ElementAppearance).clearElementAppearance(pluginId)
    },
  }), [bimComponents, pluginId])
}

export type { ModelIdMap, BimItemProperties }
