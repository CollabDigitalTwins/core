'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { TabSelector } from './TabSelector'
import { FileTab } from './FileTab'
import { LayersTab } from './LayersTab'
import { CommunicationTab } from './CommunicationTab'
import { SettingsTab } from './SettingsTab'
import { BimContext, MenusContext } from '../../../../../../store'
import type { SidebarTabType } from '../../../../../../store/Menus/reducer'
import { InfoSidebarContainer } from '../../../../../ui/InfoSidebar/Container'
import { SensorsTab } from './SensorsTab'
import type { Organization } from '../../../../../../types/dbTypes'

export function BimSidebar({ minioBaseUrl, organization }: { minioBaseUrl?: string; organization?: Organization }) {
  const { state: bimState } = React.useContext(BimContext)
  const { modelId } = bimState.bim
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
      {selectedTab === 'file' && <FileTab />}
      {selectedTab === 'layers' && <LayersTab modelId={modelId} />}
      {selectedTab === 'communication' && <CommunicationTab />}
      {selectedTab === 'sensors' && <SensorsTab minioBaseUrl={minioBaseUrl} />}
      {selectedTab === 'settings' && <SettingsTab />}
    </InfoSidebarContainer>
  )
}