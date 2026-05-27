'use client'
import * as React from 'react'
import dynamic from 'next/dynamic'

// Icons
import { MenusContext } from '../../../store'
import { MapSidebar } from '../../viewers/map/src/MapSidebar'

// Audit Phase 1.A (F-1e): BimSidebar and PointCloudSidebar are heavy
// viewer-specific UIs that statically pulled the BIM and PointCloud
// component trees (including @thatopen and Potree adjacent code) into
// the eager bundle even when the user was on the map. Now dynamic
// so they join the matching viewer's lazy chunk. MapSidebar stays
// statically imported because the map is the default landing.
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