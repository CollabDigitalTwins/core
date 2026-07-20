'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Separator } from '../../../../../ui/Separator'

import type { SidebarTabType } from '../../../../../../store/Menus/reducer'

interface TabSelectorProps {
  activeTab: SidebarTabType
  onTabChangeAction: (tab: SidebarTabType) => void
}

export function TabSelector({ activeTab, onTabChangeAction }: TabSelectorProps) {
  // Translation
  const t = useTranslations('TabSelector')

  const tabs = [
    { id: 'file', label: t('fileLabel') },
    { id: 'layers', label: t('layersTitle') },
    { id: 'communication', label: t('communicationTitle') },
    { id: 'sensors', label: t('sensorsTitle') },
    { id: 'settings', label: t('settingsTitle') },

  ]

  return (
    <div>
      <Separator />

      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`px-3 py-2 rounded-md cursor-pointer transition-colors text-xs font-medium ${
                  activeTab === tab.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
                onClick={() => onTabChangeAction(tab.id as SidebarTabType)}
              >
                {tab.label}
              </div>
            ))}
          </div>
          {/* <LR.Search className="h-4 w-4 text-muted-foreground" /> */}
        </div>
      </div>

      <Separator />
    </div>
  )
}
