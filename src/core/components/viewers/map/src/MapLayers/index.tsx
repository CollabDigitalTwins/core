// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

'use client'

import dynamic from 'next/dynamic'
import * as React from 'react'

import { useBimContext } from '../../../../../store'

import { BuildingLayer } from './src/BuildingLayers'
import { CommentLayer } from './src/CommentLayer'
import { CountryLayer } from './src/CountryLayer'
import { FileLayers } from './src/FileLayer'
import { OpenDataLayers } from './src/OpenDataLayer/src'
import { SensorLayers } from './src/SensorsLayer'
import { SiteLayer } from './src/SiteLayer/SiteLayer'


import type { Organization } from '../../../../../types/dbTypes'

const LazyBimLayer = dynamic(
  () => import('./src/BimLayer').then(m => ({ default: m.BimLayer })),
  { ssr: false },
)

function BimLayerGate() {
  const { state: bimState } = useBimContext()
  if (bimState.bim.bimModelsAddedToMap.length === 0) return null
  return <LazyBimLayer />
}

export const MapLayers = ({ minioBaseUrl, organization, maptilerKey }: { minioBaseUrl?: string; organization?: Organization; maptilerKey?: string }) => {
  return (
    <>
      <SiteLayer />
      <CountryLayer organization={organization} maptilerKey={maptilerKey} />
      <OpenDataLayers />
      <BuildingLayer />
      <CommentLayer />
      <SensorLayers minioBaseUrl={minioBaseUrl} />
      <FileLayers />
      <BimLayerGate />
    </>
  )
}
