"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'

import { MapContext } from '../../../../../../../../store/Map/context'
import { baseColourOf, datasetStyleOf } from '../../../../../utils/datasetStyle'
import { circlePaint, clusterCirclePaint, clusterCountPaint, fillPaint, heatmapPaint, labelLayout, labelPaint, LABEL_FONT, linePaint, outlinePaint, type GeometryFamily } from '../../../../../utils/styleExpressions'

import { useReportedLoadStatus } from './datasetLoadStatus'
import { groupFeaturesByGeometry, type GeometryGroup } from './geometryGroups'
import { useDatasetFeatures } from './useDatasetFeatures'
import { useDatasetProfile, useRenderableFeatures } from './useDatasetProfile'

import type { DatasetLayerProps } from './datasetLayerProps'
import type { DatasetStyle } from '../../../../../../../../types/datasetTypes'

function labelLayer(datasetName: string, family: GeometryFamily, style: DatasetStyle) {
  if (!style.label) return null
  return <Layer id={`${datasetName}-label-${family}`} type="symbol" layout={labelLayout(style.label, family)} paint={labelPaint(style.label)} />
}

function pointLayers(datasetName: string, style: DatasetStyle, baseColour: string) {
  if (style.renderer.kind === 'heatmap') {
    return { ids: [], cluster: false, layers: [<Layer key="heatmap" id={`${datasetName}-heatmap`} type="heatmap" paint={heatmapPaint(style)} />] }
  }
  const pointId = `${datasetName}-unclustered-point`
  return {
    ids: [pointId],
    cluster: true,
    layers: [
      <Layer
        key="clusters"
        id={`${datasetName}-clusters`}
        type="circle"
        filter={['has', 'point_count']}
        paint={clusterCirclePaint(baseColour)}
      />,
      <Layer
        key="cluster-count"
        id={`${datasetName}-cluster-count`}
        type="symbol"
        filter={['has', 'point_count']}
        layout={{ 'text-field': '{point_count_abbreviated}', 'text-font': LABEL_FONT, 'text-size': 12 }}
        paint={clusterCountPaint(baseColour)}
      />,
      <Layer key="point" id={pointId} type="circle" filter={['!', ['has', 'point_count']]} paint={circlePaint(style, baseColour)} />,
    ],
  }
}

function geometryLayers(datasetName: string, family: GeometryFamily, style: DatasetStyle, baseColour: string) {
  if (family === 'points') return pointLayers(datasetName, style, baseColour)
  if (family === 'lines') {
    const id = `${datasetName}-line`
    return { ids: [id], cluster: false, layers: [<Layer key="line" id={id} type="line" paint={linePaint(style, baseColour)} />] }
  }
  const fillId = `${datasetName}-fill`
  const outlineId = `${datasetName}-outline`
  return {
    ids: [fillId, outlineId],
    cluster: false,
    layers: [
      <Layer key="fill" id={fillId} type="fill" paint={fillPaint(style, baseColour)} />,
      <Layer key="outline" id={outlineId} type="line" paint={outlinePaint(style)} />,
    ],
  }
}

function renderSources(datasetName: string, index: number, groups: GeometryGroup[], style: DatasetStyle, baseColour: string) {
  const registeredIds: string[] = []
  const sources = groups.map((group) => {
    const { ids, cluster, layers } = geometryLayers(datasetName, group.family, style, baseColour)
    const sourceId = `${datasetName}-source-${group.family}${cluster ? '-clustered' : ''}`
    registeredIds.push(...ids)
    return (
      <Source key={`${index}-${sourceId}`} id={sourceId} type="geojson" data={group.featureCollection} cluster={cluster} clusterMaxZoom={11} clusterRadius={50}>
        {layers}
        {labelLayer(datasetName, group.family, style)}
      </Source>
    )
  })
  return { registeredIds, sources }
}

/** One open-data dataset drawn from GeoJSON, styled by its `DatasetStyle`; each dataset owns its own fetch lifecycle. */
export const GeoJsonDatasetLayer = React.memo(({ dataset, index, onLayerReady, onLayerRemoved }: DatasetLayerProps) => {
  const { state: mapState } = React.useContext(MapContext)
  const { featureCollection, status } = useDatasetFeatures(mapState.map.map, dataset)
  useReportedLoadStatus(dataset, status)
  useDatasetProfile(dataset, featureCollection)
  const renderable = useRenderableFeatures(dataset, featureCollection)
  const groups = React.useMemo(() => (renderable?.features.length ? groupFeaturesByGeometry(renderable) : []), [renderable])

  const releaseRef = React.useRef(dataset.release)
  React.useEffect(() => { releaseRef.current = dataset.release }, [dataset.release])
  React.useEffect(() => () => releaseRef.current?.(), [])

  const style = React.useMemo(() => datasetStyleOf(dataset), [dataset])
  const baseColour = baseColourOf(dataset)
  const content = React.useMemo(
    () => (groups.length ? renderSources(dataset.name, index, groups, style, baseColour) : null),
    [groups, dataset.name, index, style, baseColour],
  )

  const registeredKey = content?.registeredIds.join('|')
  React.useEffect(() => {
    if (registeredKey !== undefined) onLayerReady(dataset.name, registeredKey ? registeredKey.split('|') : [])
    return () => { onLayerRemoved(dataset.name) }
  }, [registeredKey, dataset.name, onLayerReady, onLayerRemoved])

  return content ? <>{content.sources}</> : null
})
GeoJsonDatasetLayer.displayName = 'GeoJsonDatasetLayer'
