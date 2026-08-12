// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { CapabilityRegistry, PluginContext } from './base'

// A legend section on the map. Split out from the map surface because it names no
// external type: a legend-only plugin needs no viewer library installed to typecheck.

export * from './base'

export interface LegendRow {
  label: string
  color: string
  count?: number
}

export interface LegendRegistration {
  id: string
  title: string
  // Called by the host's map legend on each render. Re-runs when the plugin's live
  // store changes (live counts) and reads the plugin's enabled flag (active).
  // active:false ⇒ host omits this section.
  useLegend: () => {
    active: boolean
    // Overrides registration.title when set (e.g. a city-scoped label). Host resolves title ?? registration.title.
    title?: string
    unavailable?: boolean
    rows: LegendRow[]
  }
}

/** `CapabilityRegistry` with the legend surface bound. */
export type LegendCapabilityRegistry = CapabilityRegistry<unknown, unknown, unknown, LegendRegistration>

/** The `activate()` context for a plugin that contributes a map legend. */
export type LegendPluginContext = PluginContext<unknown, unknown, unknown, LegendRegistration>
