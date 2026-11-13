'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { subdivisionCodeFromFeature } from './countryLayerUtils'

import type { Map as MaplibreMap } from 'maplibre-gl'

const RESOLVE_DEBOUNCE_MS = 150
export const MIN_SUBDIVISION_PICK_ZOOM = 5

interface Params {
  map?: MaplibreMap | null
  layerId: string
  sourceId: string
  enabled: boolean
  onResolve: (code: string) => void
  onClear: () => void
}

/**
 * Track the subdivision under the camera target; below MIN_SUBDIVISION_PICK_ZOOM a
 * user move clears it instead. Off-polygon targets report nothing, keeping the last value.
 */
export function useCameraSubdivision({ map, layerId, sourceId, enabled, onResolve, onClear }: Params) {
  const callbacksRef = React.useRef({ onResolve, onClear })

  React.useEffect(() => {
    callbacksRef.current = { onResolve, onClear }
  })

  React.useEffect(() => {
    if (!map || !enabled) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const resolveNow = (clearBelowFloor: boolean) => {
      try {
        if (map.getZoom() < MIN_SUBDIVISION_PICK_ZOOM) {
          if (clearBelowFloor) callbacksRef.current.onClear()
          return
        }
        if (!map.getLayer(layerId)) return
        const [feature] = map.queryRenderedFeatures(map.project(map.getCenter()), { layers: [layerId] })
        const code = subdivisionCodeFromFeature(feature?.properties)
        if (code) callbacksRef.current.onResolve(code)
      } catch {
        // style or source may be in a transitional state
      }
    }

    // Only a finished move clears, so a load-time deep link survives until its fly-to lands.
    const scheduleWith = (clearBelowFloor: boolean) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => resolveNow(clearBelowFloor), RESOLVE_DEBOUNCE_MS)
    }
    const schedule = () => scheduleWith(false)
    const onMoveEnd = () => scheduleWith(true)

    const onSourceData = (e: { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (e.sourceId === sourceId && e.isSourceLoaded) schedule()
    }

    map.on('moveend', onMoveEnd)
    map.on('styledata', schedule)
    map.on('sourcedata', onSourceData)
    schedule()

    return () => {
      if (timer) clearTimeout(timer)
      map.off('moveend', onMoveEnd)
      map.off('styledata', schedule)
      map.off('sourcedata', onSourceData)
    }
  }, [map, enabled, layerId, sourceId])
}
