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
 * The BIM viewer, as a plugin sees it.
 *
 * Has a runtime dependency on `@thatopen/components` and three, so it stays out of
 * the `plugins-sdk` barrel and out of anything the map route imports. Core reaches
 * it only from inside the BIM viewer's own lazy chunk; plugins import
 * `@collabdt/core/plugins-sdk/bimViewer`.
 */

export interface BimToolProps {
  components: OBC.Components | null
  world: OBC.World | null
  fragments: OBC.FragmentsManager | null
  /** Ids of every loaded model, in load order. */
  modelIds: string[]

  /** The live selection, keyed by model id. Updates as the user clicks in the viewport. */
  selection: ModelIdMap

  // Properties, not methods: standalone closures with no `this`, so a plugin can
  // destructure them out of the props without an unbound-`this` hazard.
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
 * Thin façade over the same `lib/bim*` helpers the core sidebar and toolbars use, so
 * a plugin cannot drift from core behaviour.
 *
 * Colour and opacity are not here: they are scoped to the calling plugin, which this
 * hook cannot know — core's own toolbar builds these props too. Use
 * {@link usePluginBimAppearance} from inside a plugin component instead, which also
 * makes painting available to a sidebar tab rather than only to a `bim.tools` panel.
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

export interface PluginBimAppearance {
  /**
   * Paints these elements, replacing whatever this plugin painted before. Passing no
   * items, or neither a colour nor an opacity, clears it.
   */
  setAppearance: (items: ModelIdMap, appearance: BimAppearance) => void
  /** Gives this plugin's elements back their own colours. */
  clearAppearance: () => void
}

/**
 * Colour and opacity for the elements this plugin cares about.
 *
 * Routed through core's `ElementAppearance`, which groups elements by identical
 * appearance and issues one `highlight()` per group. That is what makes this safe:
 * Fragments indexes highlight materials with a `Uint16` behind an append-only list, so
 * painting per element would spend one of the model's ~65 500 slots per element per
 * call. Per appearance it costs one, however many elements wear it. This is why the raw
 * `setColor` / `setOpacity` helpers are not exposed.
 *
 * Scoped to the calling plugin, so two plugins painting the same model do not clobber
 * one another and either can be cleared alone. A plugin's paint sits on top of colours
 * set from the Layers sidebar, and is deliberately outside that sidebar's CTRL+Z.
 */
export function usePluginBimAppearance(): PluginBimAppearance {
  const pluginId = usePluginId()
  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim

  return React.useMemo<PluginBimAppearance>(() => ({
    setAppearance: (items: ModelIdMap, appearance: BimAppearance) => {
      bimComponents?.get(ElementAppearance).setElementAppearance(pluginId, items, appearance)
    },
    clearAppearance: () => {
      bimComponents?.get(ElementAppearance).clearElementAppearance(pluginId)
    },
  }), [bimComponents, pluginId])
}

export type { ModelIdMap, BimItemProperties }
