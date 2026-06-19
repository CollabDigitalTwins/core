// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

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
