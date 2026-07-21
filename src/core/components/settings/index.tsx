"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Separator } from '../ui/'

import SettingsContent from './src/SettingsContent'
import SettingsHeader from './src/SettingsHeader'
import SettingsSidebar from './src/SettingsSidebar'

import type { SettingsTabKey } from './src/types'

export function UserSettings({ minioBaseUrl }: { minioBaseUrl?: string }) {
  const t = useTranslations('UserSettings')
  const [activeTab, setActiveTab] = React.useState<SettingsTabKey>('account')

  const tabs = React.useMemo(() => (
    [
      { key: 'account' as const, label: t('account') },
      { key: 'users' as const, label: t('users') },
      { key: 'organization' as const, label: t('organization') },
    ]
  ), [t])

  return (
    <div className="sm:p-2 overflow-hidden bg-[#fafafa] h-full">
      <div className="bg-background rounded-xl shadow min-h-full">
        <div className="flex flex-col h-full">
          <SettingsHeader title={t('settings')} />

          <div className="flex flex-col md:flex-row gap-2 p-6 flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
            <div className="flex-shrink-0 md:pr-4 lg:w-[280px]">
              <SettingsSidebar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>

            <Separator orientation="vertical" className="hidden md:!flex" />

            <SettingsContent activeTab={activeTab} minioBaseUrl={minioBaseUrl} />
          </div>
        </div>
      </div>
    </div>
  )
}
