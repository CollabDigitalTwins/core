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

  /** The building whose models are open, or null before one is chosen. */
  buildingId: number | null
  /** Storeys, plan sketching and plan overlays, scoped to this plugin. */
  floorplan: PluginFloorplan
  /** Element colours, scoped to this plugin. */
  appearance: PluginBimAppearance
  /** Lets data kept in world coordinates follow a model the user moves or turns. */
  modelPlacement: PluginModelPlacement
}

/** A confirmed move or turn of a model, for data a plugin keeps in world plan coordinates on it. */
export interface ModelPlacementChange {
  modelId: string
  /** True when the model turned, not only moved. */
  rotated: boolean
  mapPoint: (point: PlanPoint) => PlanPoint
  /** Metres the model rose; negative when it dropped. */
  elevationChange: number
}

/** What a plugin tells core about the data it keeps on a model, so a move or turn can carry it along. */
export interface ModelPlacementWatcher {
  /** Shown before the model turns; null when none of the plugin's data sits on it. */
  turnWarning: (modelId: string) => string | null
  onPlacementChanged: (change: ModelPlacementChange) => void | Promise<void>
}

export interface PluginModelPlacement {
  /** Follows every confirmed move and turn until the returned function is called. */
  watch: (watcher: ModelPlacementWatcher) => () => void
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

/** A point on a horizontal plan, in world metres: `x` east, `z` south. */
export interface PlanPoint {
  x: number
  z: number
}

export type SketchKind = 'rectangle' | 'polygon'

export interface FloorplanStorey {
  id: string
  name: string
  /** World height of the storey, in metres. */
  elevation: number
  modelId: string
}

/** One filled, optionally outlined and labelled polygon drawn on the open plan. */
export interface PlanOverlayShape {
  id: string
  points: readonly PlanPoint[]
  /** `0xRRGGBB`. */
  fill: number
  /** `0`–`1`, default 0.45. */
  opacity?: number
  stroke?: number
  label?: string
}

export interface PlanOverlayOptions {
  /** Makes the shapes clickable: hovering one brightens it and shows a pointer. */
  onShapeClick?: (shapeId: string) => void
  /** IFC spaces these shapes stand in for; the plan hides their own room fill, X and tag while the overlay is set, even with no shapes. */
  replacesSpaces?: ModelIdMap
}

/** An element's floor outline in world plan coordinates, read from its lowest flat face. */
export interface PlanFootprint {
  modelId: string
  localId: number
  outline: PlanPoint[]
  /** Square metres. */
  area: number
  centroid: PlanPoint
  /** World height of the footprint, for matching it to a storey. */
  elevation: number
}

/** The BIM floorplan as a plugin sees it. Coordinates are world metres on the horizontal plane. */
export interface PluginFloorplan {
  /** False in a viewer without floorplans; every method is then a no-op. */
  available: boolean
  storeys: FloorplanStorey[]
  active: FloorplanStorey | null
  isDrawing: boolean
  /** True while `editShape` is waiting for the user to finish reshaping an outline. */
  isEditingShape: boolean
  /** True once the open storey's vector lines exist; sketches snap to their corners. */
  hasLines: boolean
  activate: (storeyId: string) => Promise<void>
  deactivate: () => Promise<void>
  /** Projects the open storey's vector lines. Slow on large models, so it is a separate step. */
  generateLines: () => Promise<void>
  /** Fits the open plan's view to an outline, such as a space's, with some margin around it. */
  frame: (points: readonly PlanPoint[]) => Promise<void>
  /** Resolves with the drawn outline, or null when cancelled or no plan is open. */
  drawShape: (kind: SketchKind) => Promise<PlanPoint[] | null>
  /**
   * Lets the user drag the outline's corners and edges; Ctrl+click adds a corner, Delete removes one.
   * Resolves with the new outline on Enter or `finishEditingShape`, or null when cancelled.
   */
  editShape: (points: readonly PlanPoint[]) => Promise<PlanPoint[] | null>
  finishEditingShape: () => void
  /** Cancels a drawing or a shape edit in progress. */
  cancelDrawing: () => void
  /** Replaces this plugin's shapes on the open plan. They follow whichever storey is open. */
  setOverlay: (shapes: readonly PlanOverlayShape[], options?: PlanOverlayOptions) => void
  clearOverlay: () => void
  /** Floor outlines of elements such as IFCSPACEs, for drawing them with `setOverlay`. */
  getSpaceFootprints: (items: ModelIdMap) => Promise<PlanFootprint[]>
}

/** `CapabilityRegistry` with the BIM surface bound. */
export type BimCapabilityRegistry = CapabilityRegistry<unknown, BimToolProps>

/** The `activate()` context for a plugin that contributes to the BIM toolbar. */
export type BimPluginContext = PluginContext<unknown, BimToolProps>
