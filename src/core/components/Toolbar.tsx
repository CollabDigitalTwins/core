'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Components
import dynamic from 'next/dynamic'
import * as React from 'react'

import { mapToolbarTools } from '../components/viewers/map/src/tools/mapTools'
import { ViewerNames } from '../types'

import { ToolbarBody } from './ToolbarBody'

import type { Organization } from '../types/dbTypes'

// The BIM and PointCloud toolbar tool registries transitively import
// @thatopen and Potree-adjacent code. Statically importing them here (eagerly
// mounted by Viewer.tsx) kept ~456 KB of @thatopen on the map route's
// first-load JS. Dynamic-importing both per-viewer toolbars cuts that path.
//
// MapToolbar stays inline (no separate file, no dynamic) because the map
// is the default landing surface and every user pays its cost anyway.
const BimToolbar = dynamic(
  () => import('./viewers/bim/BimToolbar').then(m => ({ default: m.BimToolbar })),
  { ssr: false },
)
const PointCloudToolbar = dynamic(
  () => import('./viewers/pointcloud/PointCloudToolbar').then(m => ({ default: m.PointCloudToolbar })),
  { ssr: false },
)

interface Props {
  viewer: ViewerNames
  minioBaseUrl?: string
  martinBaseUrl?: string
  organization?: Organization
  geocodeEarthApiKey?: string
  geocoderUrl?: string
}

export function Toolbar({ viewer, minioBaseUrl, martinBaseUrl, organization, geocodeEarthApiKey, geocoderUrl }: Props) {
  if (viewer === ViewerNames.map) {
    return <ToolbarBody viewer="map" tools={mapToolbarTools({ minioBaseUrl, martinBaseUrl, organization, geocodeEarthApiKey, geocoderUrl })} />
  }
  if (viewer === ViewerNames.bim) {
    return <BimToolbar minioBaseUrl={minioBaseUrl} />
  }
  if (viewer === ViewerNames.pointcloud) {
    return <PointCloudToolbar />
  }
  return null
}
