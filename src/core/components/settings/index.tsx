"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Separator } from '../ui/'

import SettingsHeader from './src/SettingsHeader'
import SettingsSidebar from './src/SettingsSidebar'
import SettingsContent from './src/SettingsContent'
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
        <div className="flex flex-col h-screen">
          <SettingsHeader title={t('settings')} />

          <div className="flex flex-row gap-2 p-6 h-full overflow-hidden">
            <div className="hidden md:!flex flex-shrink-0 pr-4 lg:w-[280px]">
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
