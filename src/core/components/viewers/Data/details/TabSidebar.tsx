// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Badge, Button } from '../../../../components/ui/'
// Shadcn Components
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../../../../components/ui/Sidebar'
import { useTranslations } from 'next-intl'
import { usePermissions } from '../../../../store'

// Define TabOption interface
export type TabOption = {
  key: string
  label: string
  badge?: number // Optional badge count
}

type TabSidebarProps = {
  activeTab: string
  setActiveTab: (tab: string) => void
  tabOptions: TabOption[]
  associatedBuildingsCount?: number
  attachedFilesCount?: number
}

export default function TabSidebar({ activeTab, setActiveTab, tabOptions, associatedBuildingsCount, attachedFilesCount }: TabSidebarProps) {
  // Translations
  const t = useTranslations('TabSidebar')

  // Permissions
  const { ability } = usePermissions()

  return (
    <div className="flex-shrink-0 pr-4">
      <SidebarMenu className="w-auto">
        {tabOptions.map(tab => (
          <SidebarMenuItem key={tab.key} className="w-[256px]">
            <SidebarMenuButton asChild>
              <Button
                className={`text-sm flex justify-start cursor-pointer ${
                  activeTab === tab.key && 'bg-accent'
                }`}
                variant="ghost"
                onClick={() => setActiveTab(tab.key)}
                disabled={!ability.can('read', 'Building')}
              >
                <span>{tab.label}</span>
                {tab.key === 'associated-buildings' && <Badge>{tab.badge}</Badge>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}

        {/* Attached Files tab */}
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Button
              className={`text-sm flex justify-start cursor-pointer ${
                activeTab === 'attached-files' && 'bg-accent'
              }`}
              variant="ghost"
              onClick={() => setActiveTab('attached-files')}
              disabled={!ability.can('read', 'File')}
            >
              <span>{t('attached')}</span>
              <Badge>{attachedFilesCount || 0}</Badge>
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  )
}
