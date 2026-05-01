'use client'
import * as React from 'react'

// Icons
import { BuildingsContext } from '../../../store'

// New structured components
import { Header } from './Header'

interface InfoSidebarProps {
  children?: React.ReactNode
  tabSelector?: React.ReactNode
}

export function InfoSidebarContainer({
  children,
  tabSelector,
}: InfoSidebarProps) {
  const { state: buildingState } = React.useContext(BuildingsContext);
  const { building: currentBuilding } = buildingState.buildings;

  // State
  const [loadingBuildingInfo] = React.useState(false)

  return (
    <div className="w-[410px] flex flex-col h-screen bg-background border-r border-border ">
      <Header
        currentBuilding={currentBuilding}
        loadingBuildingInfo={loadingBuildingInfo}
      />

      {/* Tab Selector */}
      {tabSelector}

      {/* Tab Content */}
        {children}
    </div>
  )
}
