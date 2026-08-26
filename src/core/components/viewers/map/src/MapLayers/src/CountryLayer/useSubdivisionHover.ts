'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import type { MapLayerMouseEvent, Map as MaplibreMap } from 'maplibre-gl'

interface Params {
  map?: MaplibreMap | null
  layerId: string
  sourceId: string
  enabled: boolean
}

/** Highlight the hovered subdivision through feature-state, so pointer movement costs no React render. */
export function useSubdivisionHover({ map, layerId, sourceId, enabled }: Params) {
  React.useEffect(() => {
    if (!map || !enabled) return

    let hoveredId: string | number | null = null

    const setHover = (id: string | number | null, hover: boolean) => {
      if (id === null) return
      try {
        map.setFeatureState({ source: sourceId, id }, { hover })
      } catch {
        // source may have been swapped out with the style
      }
    }

    const onMove = (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.id ?? null
      if (id === hoveredId) return
      setHover(hoveredId, false)
      hoveredId = id
      setHover(hoveredId, true)
    }

    const onLeave = () => {
      setHover(hoveredId, false)
      hoveredId = null
    }

    map.on('mousemove', layerId, onMove)
    map.on('mouseleave', layerId, onLeave)

    return () => {
      onLeave()
      map.off('mousemove', layerId, onMove)
      map.off('mouseleave', layerId, onLeave)
    }
  }, [map, layerId, sourceId, enabled])
}
