'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { InfoSidebar } from '../../../../../components/ui/InfoSidebar'
import { TabSelector } from './TabSelector'
import { PointCloudContext, MenusContext } from '../../../../../store'
import { SidebarTabType } from '../../../../../store/Menus/reducer'
import { FileTab } from './src/FileTab'

import { SettingsTab } from './src/SettingsTab'
import { InfoSidebarContainer } from '../../../../../components/ui/InfoSidebar/Container'

export function PointCloudSidebar() {
  const { state: pointCloudState } = React.useContext(PointCloudContext)
  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const { selectedTab } = menusState.menus

  const handleTabChange = (selectedTab: SidebarTabType) => {
    menusDispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab } })
  }

  return (
    <InfoSidebarContainer
      tabSelector={
        <TabSelector
          activeTab={selectedTab}
          onTabChangeAction={handleTabChange}
        />
      }
    >
      {selectedTab === 'file' && <FileTab />}
      {/* {selectedTab === 'layers' && <PointCloudLayersTab />}*/}
      {selectedTab === 'settings' && <SettingsTab />} 
    </InfoSidebarContainer>
  )
}