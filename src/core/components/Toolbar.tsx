'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Components
import dynamic from 'next/dynamic'
import * as React from 'react'

import { useMapToolbarTools } from '../components/viewers/map/src/tools/mapTools'
import { ViewerNames } from '../types'

import { ToolbarBody } from './ToolbarBody'

import type { Organization, ViewerKey } from '../types/dbTypes'

// Dynamic: the BIM toolbar registry pulls in @thatopen, ~456 KB the map route must not carry.
//
// MapToolbar stays inline (no separate file, no dynamic) because the map
// is the default landing surface and every user pays its cost anyway.
const BimToolbar = dynamic(
  () => import('./viewers/bim/BimToolbar').then(m => ({ default: m.BimToolbar })),
  { ssr: false },
)

interface Props {
  viewer: ViewerKey
  minioBaseUrl?: string
  martinBaseUrl?: string
  organization?: Organization
  geocodeEarthApiKey?: string
  geocoderUrl?: string
}

// Own component so the tools hook is called unconditionally on the map branch,
// instead of inside Toolbar's viewer check (which would break hook ordering when
// the user switches viewers).
function MapToolbar({ minioBaseUrl, martinBaseUrl, organization, geocodeEarthApiKey, geocoderUrl }: Omit<Props, 'viewer'>) {
  const tools = useMapToolbarTools({ minioBaseUrl, martinBaseUrl, organization, geocodeEarthApiKey, geocoderUrl })

  return <ToolbarBody viewer="map" tools={tools} />
}

export function Toolbar({ viewer, minioBaseUrl, martinBaseUrl, organization, geocodeEarthApiKey, geocoderUrl }: Props) {
  if (viewer === ViewerNames.map) {
    return (
      <MapToolbar
        minioBaseUrl={minioBaseUrl}
        martinBaseUrl={martinBaseUrl}
        organization={organization}
        geocodeEarthApiKey={geocodeEarthApiKey}
        geocoderUrl={geocoderUrl}
      />
    )
  }
  if (viewer === ViewerNames.bim) {
    return <BimToolbar />
  }
  return null
}
