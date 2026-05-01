'use client'
import * as React from 'react'

// Icons
import { MenusContext } from '../../../store'
import { BimSidebar } from '../../viewers/bim/src/BimSidebar/src'
import { PointCloudSidebar } from '../../viewers/pointcloud/src/PointCloudSidebar'
import { MapSidebar } from '../../viewers/map/src/MapSidebar'



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