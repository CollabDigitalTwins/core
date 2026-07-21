'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'


import { InfoSidebarContainer } from '../../../../../components/ui/InfoSidebar/Container'
import { MenusContext, usePermissions } from '../../../../../store'

import { CommunicationTab } from './src/CommunicationTab'
import { FileTab } from './src/FileTab'
import { LayersTab } from './src/LayersTab'
import { SensorsTab } from './src/SensorsTab'
import { SettingsTab } from './src/SettingsTab'
import { TabSelector } from './TabSelector'

import type { SidebarTabType } from '../../../../../store/Menus/reducer'
import type { Organization } from '../../../../../types/dbTypes'

export function MapSidebar({ minioBaseUrl, martinBaseUrl, organization }: { minioBaseUrl?: string; martinBaseUrl?: string; organization?: Organization }) {
  // Permissions
  const { ability } = usePermissions()

  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const { selectedTab } = menusState.menus

  const handleTabChange = (selectedTab: SidebarTabType) => {
    menusDispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab } })
  }

  return (
    <InfoSidebarContainer
      organization={organization}
      tabSelector={
        <TabSelector
          activeTab={selectedTab}
          onTabChangeAction={handleTabChange}
        />
      }
    >
      {selectedTab === 'file' && ability.can('read', 'File') && <FileTab />}
      {selectedTab === 'layers' && ability.can('read', 'File') && <LayersTab martinBaseUrl={martinBaseUrl} organization={organization} />}
      {selectedTab === 'communication' && ability.can('read', 'Comment') && <CommunicationTab />}
      {selectedTab === 'sensors' && ability.can('read', 'Sensor') && <SensorsTab minioBaseUrl={minioBaseUrl} />}
      {selectedTab === 'settings' && <SettingsTab countryCode={organization?.country} />}
    </InfoSidebarContainer>
  )
}