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
import { ModelPlacementWatchers } from '../../components/viewers/bim/src/lib/modelPlacementWatchers'
import { BimContext } from '../../store/BIM/context'
import { BuildingsContext } from '../../store/Buildings/context'
import { usePluginId } from '../host/scope'

import { bindPluginFloorplan, useFloorplanSource } from './floorplan'

import type { FloorplanSource, PluginFloorplan } from './floorplan'

import type { BimItemProperties } from '../../components/viewers/bim/src/lib/bimQueries'
import type { ModelIdMap } from '../../components/viewers/bim/src/lib/bimTree'
import type { ModelPlacementChange, ModelPlacementWatcher } from '../../components/viewers/bim/src/lib/modelPlacementWatchers'
import type * as OBC from '@thatopen/components'

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

  getItemsOfCategory: (category: string) => Promise<ModelIdMap>
  /** Attributes for the given elements. Omit `attributes` for the default set. */
  getProperties: (items: ModelIdMap, attributes?: string[]) => Promise<BimItemProperties[]>

  /** The building whose models are open, or null before one is chosen. */
  buildingId: number | null
  /** Storeys, plan sketching and plan overlays, scoped to the calling plugin. */
  floorplan: PluginFloorplan
  /** Element colours, scoped to the calling plugin. */
  appearance: PluginBimAppearance
  /** Lets data kept in world coordinates follow a model the user moves or turns. */
  modelPlacement: PluginModelPlacement
}

export interface PluginModelPlacement {
  /** Follows every confirmed move and turn until the returned function is called. */
  watch: (watcher: ModelPlacementWatcher) => () => void
}

type PluginScopedProps = Pick<BimToolProps, 'floorplan' | 'appearance'>
type BimViewerBase = Omit<BimToolProps, keyof PluginScopedProps>

/** What the BIM toolbar hands its plugin tools: `forPlugin` supplies the plugin-scoped half. */
export interface BimToolHostProps extends BimViewerBase {
  forPlugin: (pluginId: string) => PluginScopedProps
}

function useBimViewerBase(): BimViewerBase {
  const { state } = React.useContext(BimContext)
  const { state: buildingsState } = React.useContext(BuildingsContext)
  const { bimComponents, world, fragments, modelIds, selection } = state.bim
  const buildingId = buildingsState.buildings.building?.id ?? null

  return React.useMemo<BimViewerBase>(() => ({
    buildingId,
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

    modelPlacement: {
      watch: (watcher: ModelPlacementWatcher) =>
        bimComponents ? bimComponents.get(ModelPlacementWatchers).watch(watcher) : () => {},
    },
  }), [bimComponents, world, fragments, modelIds, selection, buildingId])
}

function pluginScopedProps(
  components: OBC.Components | null,
  floorplan: FloorplanSource,
  pluginId: string,
): PluginScopedProps {
  return {
    floorplan: bindPluginFloorplan(floorplan, pluginId),
    appearance: createAppearance(components, pluginId),
  }
}

/** For the BIM toolbar, which renders every plugin's tool and so cannot know one plugin's id. */
export function useBimToolHostProps(): BimToolHostProps {
  const base = useBimViewerBase()
  const floorplan = useFloorplanSource(base.components)

  return React.useMemo(() => ({
    ...base,
    forPlugin: (pluginId: string) => pluginScopedProps(base.components, floorplan, pluginId),
  }), [base, floorplan])
}

/** The BIM viewer as the calling plugin sees it. Inside a plugin component only. */
export function useBimViewer(): BimToolProps {
  const pluginId = usePluginId()
  const base = useBimViewerBase()
  const floorplan = useFloorplanSource(base.components)

  return React.useMemo(
    () => ({ ...base, ...pluginScopedProps(base.components, floorplan, pluginId) }),
    [base, floorplan, pluginId],
  )
}

export interface BimAppearance {
  /** `0xRRGGBB`. Omit to keep each element's own colour. */
  color?: number
  /** `0`–`1`. Omit to leave elements opaque. */
  opacity?: number
}

export interface BimAppearanceGroup {
  items: ModelIdMap
  appearance: BimAppearance
}

export interface PluginBimAppearance {
  setAppearance: (groups: readonly BimAppearanceGroup[]) => void
  clearAppearance: () => void
}
function createAppearance(components: OBC.Components | null, pluginId: string): PluginBimAppearance {
  return {
    setAppearance: (groups: readonly BimAppearanceGroup[]) => {
      components?.get(ElementAppearance).setElementAppearance(pluginId, groups)
    },
    clearAppearance: () => {
      components?.get(ElementAppearance).clearElementAppearance(pluginId)
    },
  }
}

export function usePluginBimAppearance(): PluginBimAppearance {
  const pluginId = usePluginId()
  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim

  return React.useMemo(() => createAppearance(bimComponents, pluginId), [bimComponents, pluginId])
}

export type { ModelIdMap, BimItemProperties, ModelPlacementChange, ModelPlacementWatcher }
export type { FloorplanStorey, PlanFootprint, PlanOverlayOptions, PlanOverlayShape, PlanPoint, PluginFloorplan, SketchKind } from './floorplan'
