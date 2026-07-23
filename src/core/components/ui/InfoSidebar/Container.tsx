'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

// Icons
import { BuildingsContext } from '../../../store'

// New structured components
import { Header } from './Header'

import type { Organization } from '../../../types/dbTypes'

interface InfoSidebarProps {
  children?: React.ReactNode
  tabSelector?: React.ReactNode
  organization?: Organization
}

export function InfoSidebarContainer({
  children,
  tabSelector,
  organization,
}: InfoSidebarProps) {
  const { state: buildingState } = React.useContext(BuildingsContext);
  const { building: currentBuilding } = buildingState.buildings;

  // State
  const [loadingBuildingInfo] = React.useState(false)

  return (
    // Fills the InfoSidebar overlay wrapper (Sidebar.tsx), which owns the resizable width.
    // pr-2 keeps a consistent right gutter so content never sits flush against the edge/handle.
    <div className="w-full flex flex-col h-full min-h-0 bg-background border-r border-border pr-2">
      <Header
        currentBuilding={currentBuilding}
        loadingBuildingInfo={loadingBuildingInfo}
        organization={organization}
      />

      {/* Tab Selector */}
      {tabSelector}

      {/* Tab Content */}
        {children}
    </div>
  )
}
