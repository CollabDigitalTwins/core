"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'

import { DatasetsContext } from '../../../../../../../../store'
import { MapContext } from '../../../../../../../../store/Map/context'
import { fetchWmsFrames, type RasterSource, resolveMapServiceOnce, wmsTileTemplate } from '../../../../../datasets/src/mapServices'
import { useWmsActiveTime } from '../../../../../datasets/src/wmsActiveTime'
import { datasetStyleOf } from '../../../../../utils/datasetStyle'

import { useReportedLoadStatus } from './datasetLoadStatus'
import { useRasterTileStatus } from './useRasterTileStatus'

import type { DatasetLayerProps } from './datasetLayerProps'
import type { DatasetFeaturesStatus } from './useDatasetFeatures'
import type { Dataset } from '../../../../../../../../types/datasetTypes'

function staticSource(dataset: Dataset): RasterSource | null {
  const tileUrl = dataset.url || dataset.information
  return tileUrl ? { tileUrl, tileSize: 256 } : null
}

// Resolves the tile template once and writes what other panels need (WMS time, URL) back to the dataset.
function useRasterSource(dataset: Dataset): { source: RasterSource | null; status: DatasetFeaturesStatus } {
  const { dispatch } = React.useContext(DatasetsContext)
  const { mapService, name } = dataset
  const [resolved, setResolved] = React.useState<{ source: RasterSource | null; status: DatasetFeaturesStatus }>(
    () => (mapService ? { source: null, status: { kind: 'loading' } } : { source: staticSource(dataset), status: { kind: 'ready' } }),
  )
  const serviceKey = mapService ? `${mapService.kind}|${mapService.url}|${mapService.layer ?? ''}` : ''

  React.useEffect(() => {
    if (!mapService) return
    let cancelled = false
    resolveMapServiceOnce(mapService).then(
      (source) => {
        if (cancelled) return
        setResolved({ source, status: { kind: 'ready' } })
        dispatch({ type: 'UPDATE_ADDED_DATASET', payload: { datasetName: name, changes: { url: source.tileUrl, wms: source.wms, timeEnabled: source.timeEnabled, wmsFrames: source.frames, legend: source.legend } } })
      },
      (error: unknown) => {
        if (!cancelled) setResolved({ source: null, status: { kind: 'error', message: error instanceof Error ? error.message : 'Map service did not respond' } })
      },
    )
    return () => { cancelled = true }
  }, [serviceKey, name, dispatch])

  return resolved
}

function useStaticWmsFrames(dataset: Dataset) {
  const { dispatch } = React.useContext(DatasetsContext)
  const { name, mapService, timeEnabled, wmsFrames } = dataset
  const baseUrl = dataset.wms?.baseUrl
  const layers = dataset.wms?.layers
  const needsFrames = !mapService && timeEnabled && !wmsFrames

  React.useEffect(() => {
    if (!needsFrames || !baseUrl || !layers) return
    let cancelled = false
    void fetchWmsFrames({ baseUrl, layers }).then((frames) => {
      if (!cancelled) dispatch({ type: 'UPDATE_ADDED_DATASET', payload: { datasetName: name, changes: { wmsFrames: frames } } })
    })
    return () => { cancelled = true }
  }, [needsFrames, baseUrl, layers, name, dispatch])
}

/** One raster map service (WMS, WMTS, ArcGIS MapServer/ImageServer or XYZ); not clickable, but time-animated when WMS-T. */
export const RasterDatasetLayer = React.memo(({ dataset, index, onLayerReady, onLayerRemoved }: DatasetLayerProps) => {
  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map
  const sourceId = `${dataset.name}-source`
  const { source, status: resolveStatus } = useRasterSource(dataset)
  const tileStatus = useRasterTileStatus(map, sourceId)
  const status = resolveStatus.kind === 'ready' ? tileStatus ?? resolveStatus : resolveStatus
  useReportedLoadStatus(dataset, status)
  useStaticWmsFrames(dataset)
  const activeTime = useWmsActiveTime(dataset.name)
  const { wms } = dataset

  React.useEffect(() => {
    onLayerReady(dataset.name, [])
    return () => { onLayerRemoved(dataset.name) }
  }, [dataset.name, onLayerReady, onLayerRemoved])

  React.useEffect(() => {
    if (!map || !activeTime || !wms) return
    const rasterSource = map.getSource(sourceId) as { setTiles?: (tiles: string[]) => void } | undefined
    rasterSource?.setTiles?.([wmsTileTemplate(wms, activeTime)])
  }, [map, activeTime, sourceId, wms])

  if (!source) return null

  return (
    <Source id={sourceId} key={`${index}-${sourceId}`} type="raster" tiles={[source.tileUrl]} tileSize={source.tileSize}>
      <Layer id={`${dataset.name}-raster`} type="raster" paint={{ 'raster-opacity': datasetStyleOf(dataset).opacity }} />
    </Source>
  )
})
RasterDatasetLayer.displayName = 'RasterDatasetLayer'
