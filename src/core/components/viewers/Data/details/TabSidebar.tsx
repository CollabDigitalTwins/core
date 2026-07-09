// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Badge, Button } from '../../../../components/ui/'
// Shadcn Components
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../../../../components/ui/Sidebar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/Select'
import { useTranslations } from 'next-intl'
import { usePermissions } from '../../../../store'
import { useIsMobile } from '../../../../hooks/ui/use-mobile'

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

  const isMobile = useIsMobile()

  // Mobile: the desktop tab list below is fixed-width per item (256px)
  // inside a non-wrapping row, unusable on a narrow screen — swap to a
  // dropdown so every tab (e.g. attached files, associated buildings) stays
  // reachable. Branching on isMobile (rather than hiding via CSS classes on
  // the desktop markup) keeps the desktop render path byte-for-byte
  // unchanged from before.
  if (isMobile) {
    const canReadBuilding = ability.can('read', 'Building')
    const canReadFile = ability.can('read', 'File')

    return (
      <div className="w-full flex justify-start">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-[256px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tabOptions.map(tab => (
              <SelectItem key={tab.key} value={tab.key} disabled={!canReadBuilding}>
                {tab.label}
                {tab.key === 'associated-buildings' && tab.badge ? ` (${tab.badge})` : ''}
              </SelectItem>
            ))}
            <SelectItem value="attached-files" disabled={!canReadFile}>
              {t('attached')} ({attachedFilesCount || 0})
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    )
  }

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
