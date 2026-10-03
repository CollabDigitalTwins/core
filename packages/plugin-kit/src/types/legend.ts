// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { CapabilityRegistry, PluginContext, PluginNode, PluginViewerTarget } from './base'

// Split out from the map surface because it names no external type: a legend-only plugin
// needs no viewer library installed to typecheck.

export * from './base'

export interface LegendRow {
  label: string
  color: string
  count?: number
  /** With `onVisibleChange`, the row gets a switch; false dims it. */
  visible?: boolean
  onVisibleChange?: (visible: boolean) => void
}

export interface LegendRegistration {
  id: string
  title: string
  /** Which viewers this legend appears in. Omit for all of them. */
  viewers?: PluginViewerTarget[]
  /** A `map.datasets` id of the same plugin: the map nests this legend under that applied dataset. */
  dataset?: string
  // A hook, called by the host's legend on each render, so rows can carry live counts.
  useLegend: () => {
    /** False omits the section entirely, which is what a legend with nothing to say should do. */
    active: boolean
    /** Overrides `title` when set, for a scoped label. */
    title?: string
    unavailable?: boolean
    rows: LegendRow[]
    /** The plugin's own inputs under the rows, such as a date slider filtering what is drawn. */
    controls?: PluginNode
  }
}

/** `CapabilityRegistry` with the legend surface bound. */
export type LegendCapabilityRegistry = CapabilityRegistry<unknown, unknown, LegendRegistration>

/** The `activate()` context for a plugin that contributes a map legend. */
export type LegendPluginContext = PluginContext<unknown, unknown, LegendRegistration>
