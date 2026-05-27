'use client'
import * as React from 'react'
import { TabSelector } from './TabSelector'
import { MenusContext, usePermissions } from '../../../../../store'
import { SidebarTabType } from '../../../../../store/Menus/reducer'
import { FileTab } from './src/FileTab'
import { LayersTab } from './src/LayersTab'
// import { DatasetsTab } from './src/DatasetsTab'

import { SettingsTab } from './src/SettingsTab'
import { InfoSidebarContainer } from '../../../../../components/ui/InfoSidebar/Container'
import { CommunicationTab } from './src/CommunicationTab'
import { SensorsTab } from './src/SensorsTab'

export function MapSidebar() {
  // Permissions
  const { ability } = usePermissions()

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
      {selectedTab === 'file' && ability.can('read', 'File') && <FileTab />}
      {selectedTab === 'layers' && ability.can('read', 'File') && <LayersTab />}
      {selectedTab === 'communication' && ability.can('read', 'Comment') && <CommunicationTab />}
      {selectedTab === 'sensors' && ability.can('read', 'Sensor') && <SensorsTab />}
      {selectedTab === 'settings' && <SettingsTab />} 
    </InfoSidebarContainer>
  )
}