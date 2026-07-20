'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import dynamic from 'next/dynamic'
import * as React from 'react'

// Icons
import { MenusContext } from '../../../store'
import { MapSidebar } from '../../viewers/map/src/MapSidebar'

import type { Organization } from '../../../types/dbTypes'

const BimSidebar = dynamic(
  () => import('../../viewers/bim/src/BimSidebar/src').then(m => ({ default: m.BimSidebar })),
  { ssr: false },
)
const PointCloudSidebar = dynamic(
  () => import('../../viewers/pointcloud/src/PointCloudSidebar').then(m => ({ default: m.PointCloudSidebar })),
  { ssr: false },
)

export function InfoSidebar({ minioBaseUrl, martinBaseUrl, organization, pointcloudApiUrl }: { minioBaseUrl?: string; martinBaseUrl?: string; organization?: Organization; pointcloudApiUrl?: string }) {
  const { state: menusState } = React.useContext(MenusContext)
  const { currentViewer } = menusState.menus

  return (
    <>
      {currentViewer === 'map' && <MapSidebar minioBaseUrl={minioBaseUrl} martinBaseUrl={martinBaseUrl} organization={organization} />}
      {currentViewer === 'bim' && <BimSidebar minioBaseUrl={minioBaseUrl} organization={organization} />}
      {currentViewer === 'pointcloud' && <PointCloudSidebar pointcloudApiUrl={pointcloudApiUrl} organization={organization} />}
    </>
  )
}