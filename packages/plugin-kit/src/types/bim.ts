// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { CapabilityRegistry, PluginContext } from './base'
import type * as OBC from '@thatopen/components'

/**
 * The BIM viewer, as a plugin sees it.
 *
 * This is the only entry that names the BIM library, so a map or point-cloud
 * plugin never has to install it. Install `@thatopen/components` as a
 * devDependency to typecheck against this entry.
 *
 * Note that a plugin only ever *types* against it: the viewer arrives as props, so
 * a plugin bundle must never import it at runtime. Doing so loads a second copy of
 * three.js and breaks the viewer; the kit's build preset refuses such a bundle.
 */

export * from './base'

/**
 * Elements keyed by the model they belong to.
 *
 * Core takes this from `components/viewers/bim/src/lib/bimTree`, which re-exports
 * the BIM library's own alias. It is restated here because that path is internal
 * to core and unreachable from outside it. The definition is the library's,
 * verbatim.
 */
export type ModelIdMap = Record<string, Set<number>>

/**
 * Attributes read back for one element.
 *
 * Restated from core's `components/viewers/bim/src/lib/bimQueries`, again an
 * internal path. `modelId` and `localId` are always present so a result maps back
 * to the element it came from; everything else depends on which attributes were
 * requested and what the model carries.
 */
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

  // Declared as properties rather than methods on purpose: they are standalone
  // closures with no `this`, so a plugin can destructure them out of the props —
  // which is how every example uses them — without the unbound-`this` hazard that
  // method shorthand would imply.
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
   * Every element of one IFC class, e.g. `getItemsOfCategory('IFCSPACE')`.
   *
   * Spaces in particular start hidden — they are volumetric and would obscure the
   * elements inside them — so a plugin that wants to show them needs a
   * `setItemsVisible(spaces, true)` as well.
   */
  getItemsOfCategory: (category: string) => Promise<ModelIdMap>
  /** Attributes for the given elements. Omit `attributes` for the default set. */
  getProperties: (items: ModelIdMap, attributes?: string[]) => Promise<BimItemProperties[]>
}

/** `CapabilityRegistry` with the BIM surface bound. */
export type BimCapabilityRegistry = CapabilityRegistry<unknown, BimToolProps>

/** The `activate()` context for a plugin that contributes to the BIM toolbar. */
export type BimPluginContext = PluginContext<unknown, BimToolProps>
