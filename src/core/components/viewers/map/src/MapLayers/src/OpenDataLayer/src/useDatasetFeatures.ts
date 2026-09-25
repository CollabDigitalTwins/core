// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import type { Dataset } from '../../../../../../../../types/datasetTypes'
import type { FeatureCollection } from 'geojson'
import type { Map as MapLibreMap } from 'maplibre-gl'

export type DatasetFeaturesStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'belowMinZoom'; minZoom: number }
  | { kind: 'error'; message: string }

type FeatureRequest = Parameters<Dataset['getFeatures']>[0]

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }
export const VIEWPORT_DEBOUNCE_MS = 300

function asFeatureCollection(fetched: unknown): FeatureCollection {
  return (fetched as { type?: unknown } | null)?.type === 'FeatureCollection' ? fetched as FeatureCollection : EMPTY
}

function currentView(map: MapLibreMap): { bbox: [number, number, number, number]; zoom: number } {
  const bounds = map.getBounds()
  return { bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], zoom: map.getZoom() }
}

/** Loads a dataset once, or — when it declares a `viewport` — for the visible bbox after every settled pan or zoom. */
export function useDatasetFeatures(map: MapLibreMap | null, dataset: Pick<Dataset, 'name' | 'getFeatures' | 'viewport'>) {
  const { name, getFeatures } = dataset
  const minZoom = dataset.viewport?.minZoom
  const [featureCollection, setFeatureCollection] = React.useState<FeatureCollection | null>(null)
  const [status, setStatus] = React.useState<DatasetFeaturesStatus>({ kind: 'loading' })
  const getFeaturesRef = React.useRef(getFeatures)
  React.useEffect(() => { getFeaturesRef.current = getFeatures }, [getFeatures])

  React.useEffect(() => {
    if (!map) return
    let cancelled = false
    let latestRequest = 0
    let debounce: ReturnType<typeof setTimeout> | undefined

    const load = async () => {
      const request = ++latestRequest
      const isCurrent = () => !cancelled && request === latestRequest
      const view: FeatureRequest = minZoom === undefined ? undefined : currentView(map)
      if (minZoom !== undefined && view?.zoom !== undefined && view.zoom < minZoom) {
        setFeatureCollection(EMPTY)
        setStatus({ kind: 'belowMinZoom', minZoom })
        return
      }
      try {
        const fetched = await getFeaturesRef.current(view)
        if (!isCurrent()) return
        setFeatureCollection(asFeatureCollection(fetched))
        setStatus({ kind: 'ready' })
      }
      catch (error) {
        if (!isCurrent()) return
        console.error(`OpenDataLayers: Error fetching features for "${name}":`, error)
        setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    }

    void load()
    if (minZoom === undefined) return () => { cancelled = true }

    const onMoveEnd = () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => void load(), VIEWPORT_DEBOUNCE_MS)
    }
    map.on('moveend', onMoveEnd)
    return () => {
      cancelled = true
      clearTimeout(debounce)
      map.off('moveend', onMoveEnd)
    }
  }, [map, name, minZoom])

  return { featureCollection, status }
}
