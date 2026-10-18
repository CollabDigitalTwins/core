// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { VIEWPORT_MIN_ZOOM } from '../../../../../datasets/src/viewportLoader'
import { mapBbox, type FlatBounds } from '../../../../../utils/validateBounds'

import type { Dataset, FeatureRequest, LoadedFeatures, LoadProgress } from '../../../../../../../../types/datasetTypes'
import type { FeatureCollection } from 'geojson'
import type { Map as MapLibreMap } from 'maplibre-gl'

export type DatasetFeaturesStatus =
  | { kind: 'loading'; progress?: LoadProgress }
  | { kind: 'ready'; truncatedAt?: number; featureCount?: number; bytes?: number }
  | { kind: 'belowMinZoom'; minZoom: number }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }
export const VIEWPORT_DEBOUNCE_MS = 300

function asLoadedFeatures(fetched: unknown): LoadedFeatures {
  return (fetched as { type?: unknown } | null)?.type === 'FeatureCollection' ? fetched as LoadedFeatures : EMPTY
}

function currentView(map: MapLibreMap): { bbox: FlatBounds; zoom: number } {
  return { bbox: mapBbox(map), zoom: map.getZoom() }
}

function progressKey({ fraction, featureCount }: LoadProgress): string {
  return `${fraction === undefined ? '' : Math.round(fraction * 100)}|${featureCount ?? ''}`
}

function readyStatus(loaded: LoadedFeatures, bytes: number | undefined): DatasetFeaturesStatus {
  return {
    kind: 'ready',
    ...(loaded.truncatedAt !== undefined && { truncatedAt: loaded.truncatedAt }),
    featureCount: loaded.features.length,
    ...(bytes !== undefined && { bytes }),
  }
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
    let inFlight: AbortController | undefined
    let debounce: ReturnType<typeof setTimeout> | undefined

    const showBelowMinZoom = (zoom: number) => {
      setFeatureCollection(EMPTY)
      setStatus(previous => (previous.kind === 'belowMinZoom' && previous.minZoom === zoom ? previous : { kind: 'belowMinZoom', minZoom: zoom }))
    }

    const load = async () => {
      const request = ++latestRequest
      inFlight?.abort()
      const controller = new AbortController()
      inFlight = controller
      const isCurrent = () => !cancelled && request === latestRequest
      let view: ReturnType<typeof currentView> | undefined
      if (minZoom !== undefined) {
        view = currentView(map)
        if (view.zoom < minZoom) {
          showBelowMinZoom(minZoom)
          return
        }
      }
      let bytes: number | undefined
      let reportedProgress: string | undefined
      const onProgress = (progress: LoadProgress) => {
        if (!isCurrent()) return
        bytes = progress.bytes ?? bytes
        const key = progressKey(progress)
        if (key === reportedProgress) return
        reportedProgress = key
        setStatus({ kind: 'loading', progress })
      }
      const featureRequest: FeatureRequest = { ...view, onProgress, signal: controller.signal }
      try {
        const loaded = asLoadedFeatures(await getFeaturesRef.current(featureRequest))
        if (!isCurrent()) return
        setFeatureCollection(loaded)
        const wholeLoad = view === undefined || view.zoom < VIEWPORT_MIN_ZOOM
        setStatus(wholeLoad && loaded.features.length === 0 ? { kind: 'empty' } : readyStatus(loaded, bytes))
      }
      catch (error) {
        if (!isCurrent()) return
        console.error(`OpenDataLayers: Error fetching features for "${name}":`, error)
        setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    }

    const cancel = () => {
      cancelled = true
      inFlight?.abort()
    }

    void load()
    if (minZoom === undefined) return cancel

    const onMoveEnd = () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => void load(), VIEWPORT_DEBOUNCE_MS)
    }
    map.on('moveend', onMoveEnd)
    return () => {
      cancel()
      clearTimeout(debounce)
      map.off('moveend', onMoveEnd)
    }
  }, [map, name, minZoom])

  return { featureCollection, status }
}
