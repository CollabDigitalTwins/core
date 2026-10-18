"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'

import { baseColourOf, datasetStyleOf } from '../../../../../utils/datasetStyle'
import { circlePaint, colourExpression, fillPaint, outlinePaint } from '../../../../../utils/styleExpressions'

import type { DatasetLayerProps } from './datasetLayerProps'
import type { Dataset } from '../../../../../../../../types/datasetTypes'
import type { FillExtrusionLayerSpecification } from 'maplibre-gl'

function sourceLayerName(dataset: Dataset): string {
  return dataset.id || dataset.name.toLowerCase().replace(/\s+/g, '_')
}

/** One open-data dataset drawn from vector tiles; building layers extrude, everything else uses the dataset style. */
export const MVTDatasetLayer = React.memo(({ dataset, index, onLayerReady, onLayerRemoved }: DatasetLayerProps) => {
  const tileUrl = dataset.url || dataset.information
  const sourceLayer = sourceLayerName(dataset)
  const style = React.useMemo(() => datasetStyleOf(dataset), [dataset])
  const baseColour = baseColourOf(dataset)
  const isPointLayer = dataset.layerType === 'circle' || /point/i.test(sourceLayer)
  const isBuildingLayer = /buildings?/i.test(sourceLayer) && !isPointLayer
  const paint = React.useMemo(() => ({
    circle: circlePaint(style, baseColour),
    extrusion: {
      'fill-extrusion-color': colourExpression(style.renderer, baseColour),
      'fill-extrusion-height': ['coalesce', ['to-number', ['get', 'heightmax']], 0],
      'fill-extrusion-opacity': style.opacity,
    } satisfies FillExtrusionLayerSpecification['paint'],
    fill: fillPaint(style, baseColour),
    outline: outlinePaint(style),
  }), [style, baseColour])

  const mainLayerId = isPointLayer ? `${dataset.name}-points` : isBuildingLayer ? `${dataset.name}-extrusion` : `${dataset.name}-fill`
  const outlineLayerId = `${dataset.name}-outline`

  React.useEffect(() => {
    onLayerReady(dataset.name, isPointLayer ? [mainLayerId] : [mainLayerId, outlineLayerId])
    return () => { onLayerRemoved(dataset.name) }
  }, [dataset.name, mainLayerId, outlineLayerId, isPointLayer, onLayerReady, onLayerRemoved])

  if (!tileUrl) {
    console.error(`OpenDataLayers: no tile URL for MVT dataset "${dataset.name}"`)
    return null
  }

  return (
    <Source id={`${dataset.name}-source`} key={`${index}-${dataset.name}-source`} type="vector" tiles={[tileUrl]}>
      {isPointLayer && <Layer id={mainLayerId} type="circle" source-layer={sourceLayer} paint={paint.circle} />}
      {isBuildingLayer && (
        <Layer
          id={mainLayerId}
          type="fill-extrusion"
          source-layer={sourceLayer}
          minzoom={15.5}
          paint={paint.extrusion}
        />
      )}
      {!isPointLayer && !isBuildingLayer && <Layer id={mainLayerId} type="fill" source-layer={sourceLayer} paint={paint.fill} />}
      {!isPointLayer && <Layer id={outlineLayerId} type="line" source-layer={sourceLayer} paint={paint.outline} />}
    </Source>
  )
})
MVTDatasetLayer.displayName = 'MVTDatasetLayer'
