'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

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

import type { BimItemProperties } from '../../components/viewers/bim/src/lib/bimQueries'
import type { ModelIdMap } from '../../components/viewers/bim/src/lib/bimTree'
import type * as OBC from '@thatopen/components'

/**
 * The BIM viewer, as a plugin sees it.
 *
 * This module has a **runtime** dependency on `@thatopen/components` and three, so
 * it is kept out of the `plugins-sdk` barrel and out of anything the map route
 * imports. Core consumes it only from inside the BIM viewer's own lazy chunk;
 * plugins import `@collabdt/core/plugins-sdk/bimViewer` (or the `viewer` barrel,
 * which is fine — a plugin bundle is loaded separately anyway).
 */

export interface BimToolProps {
  components: OBC.Components | null
  world: OBC.World | null
  fragments: OBC.FragmentsManager | null
  /** Ids of every loaded model, in load order. */
  modelIds: string[]

  /** The live selection, keyed by model id. Updates as the user clicks in the viewport. */
  selection: ModelIdMap
  select(items: ModelIdMap): Promise<void>
  clearSelection(): void
  /** Frame the camera on whatever is currently selected. */
  fitToSelection(): Promise<void>

  /** Hides everything except `items`, across every loaded model. */
  isolate(items: ModelIdMap): Promise<void>
  setItemsVisible(items: ModelIdMap, visible: boolean): Promise<void>
  /** The escape hatch from `isolate`: makes everything visible again. */
  showAll(): Promise<void>

  /**
   * Every element of one IFC class, e.g. `getItemsOfCategory('IFCSPACE')`.
   *
   * Spaces in particular start hidden — they are volumetric and would obscure the
   * elements inside them — so a plugin that wants to show them needs a
   * `setItemsVisible(spaces, true)` as well.
   */
  getItemsOfCategory(category: string): Promise<ModelIdMap>
  /** Attributes for the given elements. Omit `attributes` for the default set. */
  getProperties(items: ModelIdMap, attributes?: string[]): Promise<BimItemProperties[]>
}

/**
 * Thin façade: every action delegates to the same `lib/bimItemActions`,
 * `lib/bimCamera` and `lib/bimQueries` helpers the core sidebar and toolbars use,
 * so a plugin cannot drift from core behaviour. `selection` is read from the
 * store, which `SelectionSync` keeps in step with the Highlighter.
 *
 * Colour and opacity overrides are deliberately absent. Core routes those through
 * `ElementAppearance`, which buckets them into one Fragments material definition
 * per appearance and shares a CTRL+Z history with the sidebar; raw per-element
 * painting would spend one of the model's ~65 500 material slots per element per
 * call and exhaust them. Use `select` and `isolate` to draw attention instead.
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

export type { ModelIdMap, BimItemProperties }
