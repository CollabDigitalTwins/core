'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'

import { CountryLayer } from './src/CountryLayer'
import { CommentLayer } from './src/CommentLayer'
import { SensorLayers } from './src/SensorsLayer'
import { FileLayers } from './src/FileLayer'
import { OpenDataLayers } from './src/OpenDataLayer/src'
import { BuildingLayer } from './src/BuildingLayers'
import { useBimContext } from '../../../../../store'

// Audit Phase 1.A (F-1b): lazy-load the on-map BIM custom layer.
// BimLayer statically imports @thatopen/components, @thatopen/components-front,
// @thatopen/fragments, and web-ifc — together about 800 KB gzipped on the
// initial bundle. F-1 alone could not move them because BimLayer was rendered
// eagerly inside MapLayers, keeping the static import chain alive.
//
// Strategy: render <LazyBimLayer /> through a tiny gate component that
// consumes only the BIM context. While the user has no BIM models on the
// map, the gate returns null and the dynamic chunk is never fetched. The
// first time the user adds a model (dispatch ADD_BIM_MODEL_TO_MAP), the
// gate flips, the chunk downloads (~456 KB gzipped, cached thereafter),
// and BimLayer mounts. The gate isolates context consumption so MapLayers
// itself does not re-render on every BIM state change.
const LazyBimLayer = dynamic(
  () => import('./src/BimLayer').then(m => ({ default: m.BimLayer })),
  { ssr: false },
)

function BimLayerGate() {
  const { state: bimState } = useBimContext()
  if (bimState.bim.bimModelsAddedToMap.length === 0) return null
  return <LazyBimLayer />
}

export const MapLayers = () => {
  return (
    <>
      <CountryLayer />
      <OpenDataLayers />
      <BuildingLayer />
      <CommentLayer />
      <SensorLayers />
      <FileLayers />
      <BimLayerGate />
    </>
  )
}
