"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useIsMobile } from '../../../hooks/ui/use-mobile'
import { usePermissions } from '../../../store'
import { Button } from '../../ui/'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../../ui/Sidebar'

import type { SettingsTabKey } from './types'

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

  const isMobile = useIsMobile()

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

  const visibleTabs = tabs.filter(tab => isTabVisible(tab.key))

  // Mobile: the desktop sidebar list below is `hidden` under md, with no
  // other way to reach it — swap to a dropdown so tabs (e.g. "Organization")
  // stay reachable on narrow viewports. Branching on isMobile (rather than
  // hiding via CSS classes on the desktop markup) keeps the desktop render
  // path byte-for-byte unchanged from before.
  if (isMobile) {
    return (
      <div className="w-full">
        <Select value={activeTab} onValueChange={value => onTabChange(value as SettingsTabKey)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {visibleTabs.map(tab => (
              <SelectItem key={tab.key} value={tab.key} disabled={tab.disabled}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <SidebarMenu className="w-full">
      {visibleTabs.map(tab => (
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
