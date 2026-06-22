'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import dynamic from 'next/dynamic'

// Icons
import { MenusContext } from '../../../store'
import { MapSidebar } from '../../viewers/map/src/MapSidebar'

const BimSidebar = dynamic(
  () => import('../../viewers/bim/src/BimSidebar/src').then(m => ({ default: m.BimSidebar })),
  { ssr: false },
)
const PointCloudSidebar = dynamic(
  () => import('../../viewers/pointcloud/src/PointCloudSidebar').then(m => ({ default: m.PointCloudSidebar })),
  { ssr: false },
)

export function InfoSidebar() {
  const { state: menusState } = React.useContext(MenusContext)
  const { currentViewer } = menusState.menus

  return (
    <>
      {currentViewer === 'map' && <MapSidebar />}
      {currentViewer === 'bim' && <BimSidebar />}
      {currentViewer === 'pointcloud' && <PointCloudSidebar />}
    </>
  )
}