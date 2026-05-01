"use client"

import { Button } from '../../ui/'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../../ui/Sidebar'
import type { SettingsTabKey } from './types'
import { usePermissions } from '../../../store'

type SettingsTab = {
  key: SettingsTabKey
  label: string
  disabled?: boolean
}

type SettingsSidebarProps = {
  tabs: SettingsTab[]
  activeTab: SettingsTabKey
  onTabChange: (tab: SettingsTabKey) => void
}

export default function SettingsSidebar({ tabs, activeTab, onTabChange }: SettingsSidebarProps) {
  
  // Permissions
  const { ability } = usePermissions()
  
  // Helper to check if tab should be visible
  const isTabVisible = (tabKey: SettingsTabKey) => {
    if (tabKey === 'users') {
      return ability.can('update', 'Role')
    }
    if (tabKey === 'organization') {
      return ability.can('update', 'Organization')
    }
    return true
  }
  
  return (
    <SidebarMenu className="w-full">
      {tabs.filter(tab => isTabVisible(tab.key)).map(tab => (
        <SidebarMenuItem key={tab.key}>
          <SidebarMenuButton asChild>
            <Button
              className={`text-sm flex justify-start pointer-events-auto cursor-pointer ${activeTab === tab.key ? 'bg-accent' : ''}`}
              variant="ghost"
              onClick={() => onTabChange(tab.key)}
              disabled={tab.disabled}
            >
              <span>{tab.label}</span>
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
