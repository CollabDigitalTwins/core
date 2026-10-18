// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import type { DatasetFeaturesStatus } from './useDatasetFeatures'
import type { MapEventType, Map as MapLibreMap } from 'maplibre-gl'

type SourceEvent = MapEventType['data'] | MapEventType['dataabort'] | MapEventType['error']

const sourceIdOf = (event: SourceEvent) => ('sourceId' in event && typeof event.sourceId === 'string' ? event.sourceId : undefined)
const hasTile = (event: SourceEvent) => 'tile' in event && Boolean(event.tile)

const LOADING: DatasetFeaturesStatus = { kind: 'loading' }
const READY: DatasetFeaturesStatus = { kind: 'ready' }

function statusKey(status: DatasetFeaturesStatus): string {
  if (status.kind === 'loading') return `loading:${status.progress?.fraction === undefined ? '' : Math.round(status.progress.fraction * 100)}`
  return status.kind === 'error' ? `error:${status.message}` : status.kind
}

/** Whether a raster source's tiles are still arriving, all drawn, or every one failing before any could draw. */
export function useRasterTileStatus(map: MapLibreMap | null, sourceId: string): DatasetFeaturesStatus | undefined {
  const [status, setStatus] = React.useState<DatasetFeaturesStatus | undefined>(undefined)

  React.useEffect(() => {
    if (!map) return
    let drewTile = false
    let requested = 0
    let drawn = 0
    let failed = 0
    let aborted = 0
    let reportedKey: string | undefined
    const report = (next: DatasetFeaturesStatus) => {
      const key = statusKey(next)
      if (key === reportedKey) return
      reportedKey = key
      setStatus(next)
    }
    const isOwnSource = (event: SourceEvent) => sourceIdOf(event) === sourceId
    const settled = () => drawn + failed + aborted
    const progress = (): DatasetFeaturesStatus => (requested > 0 ? { kind: 'loading', progress: { fraction: Math.min(1, settled() / requested) } } : LOADING)
    const resetCounts = () => {
      requested = 0
      drawn = 0
      failed = 0
      aborted = 0
    }
    const onLoading = (event: SourceEvent) => {
      if (!isOwnSource(event)) return
      if (hasTile(event)) requested += 1
      report(progress())
    }
    const onData = (event: SourceEvent) => {
      if (!isOwnSource(event)) return
      if (hasTile(event)) {
        drewTile = true
        drawn += 1
      }
      if (!map.isSourceLoaded(sourceId)) return report(progress())
      resetCounts()
      report(READY)
    }
    const onAbort = (event: SourceEvent) => {
      if (!isOwnSource(event) || !hasTile(event)) return
      aborted += 1
      report(progress())
    }
    const onIdle = () => {
      if (requested === 0 || !map.isSourceLoaded(sourceId)) return
      const drewNothing = !drewTile
      resetCounts()
      report(drewNothing ? { kind: 'error', message: 'The map service sent no tiles' } : READY)
    }
    const onError = (event: MapEventType['error']) => {
      if (!isOwnSource(event) || requested === 0) return
      failed += 1
      if (!drewTile && failed >= requested) report({ kind: 'error', message: event.error.message || 'The map service sent no tiles' })
      else report(progress())
    }
    map.on('dataloading', onLoading)
    map.on('data', onData)
    map.on('error', onError)
    map.on('dataabort', onAbort)
    map.on('idle', onIdle)
    return () => {
      map.off('dataloading', onLoading)
      map.off('data', onData)
      map.off('error', onError)
      map.off('dataabort', onAbort)
      map.off('idle', onIdle)
    }
  }, [map, sourceId])

  return status
}
