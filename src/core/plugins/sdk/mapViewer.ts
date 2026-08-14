'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { MapContext } from '../../store/Map/context'

import type { Map as MapLibreMap } from 'maplibre-gl'

/**
 * The GIS map, as a plugin sees it.
 *
 * Kept separate from `bimViewer` so core's own map toolbar can consume it without
 * pulling `@thatopen` and three into the eager map-route bundle. Plugins can
 * import either this module or the `viewer` barrel.
 */

export interface MapToolProps {
  /** Null until the map has finished initialising, and in non-map viewers. */
  map: MapLibreMap | null
}

export function useMapViewer(): MapToolProps {
  const { state } = React.useContext(MapContext)
  const map = (state.map.map as MapLibreMap | null) ?? null

  return React.useMemo(() => ({ map }), [map])
}
