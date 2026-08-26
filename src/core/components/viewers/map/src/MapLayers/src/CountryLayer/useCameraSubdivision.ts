'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { subdivisionCodeFromFeature } from './countryLayerUtils'

import type { Map as MaplibreMap } from 'maplibre-gl'

const RESOLVE_DEBOUNCE_MS = 150

interface Params {
  map?: MaplibreMap | null
  layerId: string
  sourceId: string
  enabled: boolean
  onResolve: (code: string) => void
}

/**
 * Track which administrative subdivision the camera is looking at, resolving the
 * polygon under the camera target after every move. Nothing is reported when the
 * target sits outside the loaded polygons, so the caller keeps its last value.
 */
export function useCameraSubdivision({ map, layerId, sourceId, enabled, onResolve }: Params) {
  const onResolveRef = React.useRef(onResolve)

  React.useEffect(() => {
    onResolveRef.current = onResolve
  })

  React.useEffect(() => {
    if (!map || !enabled) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const resolveNow = () => {
      try {
        if (!map.getLayer(layerId)) return
        const [feature] = map.queryRenderedFeatures(map.project(map.getCenter()), { layers: [layerId] })
        const code = subdivisionCodeFromFeature(feature?.properties)
        if (code) onResolveRef.current(code)
      } catch {
        // style or source may be in a transitional state
      }
    }

    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(resolveNow, RESOLVE_DEBOUNCE_MS)
    }

    const onSourceData = (e: { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (e.sourceId === sourceId && e.isSourceLoaded) schedule()
    }

    map.on('moveend', schedule)
    map.on('styledata', schedule)
    map.on('sourcedata', onSourceData)
    schedule()

    return () => {
      if (timer) clearTimeout(timer)
      map.off('moveend', schedule)
      map.off('styledata', schedule)
      map.off('sourcedata', onSourceData)
    }
  }, [map, enabled, layerId, sourceId])
}
