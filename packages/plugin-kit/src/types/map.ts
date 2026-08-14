// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { CapabilityRegistry, PluginContext } from './base'
import type { Map as MapLibreMap } from 'maplibre-gl'

// The GIS map, as a plugin sees it. The only entry that names `maplibre-gl`, so a plugin
// that never touches the map never installs it; one that does needs it as a devDependency
// to typecheck against this entry.

export * from './base'

export interface MapToolProps {
  /** Null until the map has finished initialising, and in non-map viewers. */
  map: MapLibreMap | null
}

/** `CapabilityRegistry` with the map surface bound. */
export type MapCapabilityRegistry = CapabilityRegistry<MapToolProps>

/** The `activate()` context for a plugin that contributes to the map toolbar. */
export type MapPluginContext = PluginContext<MapToolProps>
