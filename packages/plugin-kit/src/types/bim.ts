// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { CapabilityRegistry, PluginContext } from './base'
import type * as OBC from '@thatopen/components'

// The only entry that names `@thatopen/components`, and only ever as types: the viewer arrives
// as props, and importing the library at runtime loads a second copy of three.js and breaks the
// viewer, which the build preset refuses.

export * from './base'

/** Elements keyed by model. Restated here because core reaches this alias through an internal path. */
export type ModelIdMap = Record<string, Set<number>>

/** One element's attributes. `modelId` and `localId` are always present; the rest is what was asked for. */
export interface BimItemProperties extends Record<string, unknown> {
  modelId: string
  localId: number
}

export interface BimToolProps {
  components: OBC.Components | null
  world: OBC.World | null
  fragments: OBC.FragmentsManager | null
  /** Ids of every loaded model, in load order. */
  modelIds: string[]
  /** The live selection, keyed by model id. Updates as the user clicks in the viewport. */
  selection: ModelIdMap

  // Properties rather than methods: standalone closures with no `this`, so a plugin can
  // destructure them out of the props without the unbound-`this` hazard method shorthand implies.
  select: (items: ModelIdMap) => Promise<void>
  clearSelection: () => void
  /** Frame the camera on whatever is currently selected. */
  fitToSelection: () => Promise<void>

  /** Hides everything except `items`, across every loaded model. */
  isolate: (items: ModelIdMap) => Promise<void>
  setItemsVisible: (items: ModelIdMap, visible: boolean) => Promise<void>
  /** The escape hatch from `isolate`: makes everything visible again. */
  showAll: () => Promise<void>

  // IFCSPACE elements start hidden, being volumetric, so showing them also needs
  // setItemsVisible(spaces, true).
  getItemsOfCategory: (category: string) => Promise<ModelIdMap>
  /** Attributes for the given elements. Omit `attributes` for the default set. */
  getProperties: (items: ModelIdMap, attributes?: string[]) => Promise<BimItemProperties[]>
}

/** `CapabilityRegistry` with the BIM surface bound. */
export type BimCapabilityRegistry = CapabilityRegistry<unknown, BimToolProps>

/** The `activate()` context for a plugin that contributes to the BIM toolbar. */
export type BimPluginContext = PluginContext<unknown, BimToolProps>
