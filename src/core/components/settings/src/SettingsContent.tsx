"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import AccountSettingsPanel from './AccountSettingsPanel'
import OrganizationSettingsPanel from './OrganizationSettingsPanel'
import UsersSettingsPanel from './UsersSettingsPanel'

import type { SettingsTabKey } from './types'

type SettingsContentProps = {
  activeTab: SettingsTabKey
  minioBaseUrl?: string
}

export default function SettingsContent({ activeTab, minioBaseUrl }: SettingsContentProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6">
      {activeTab === 'account' ? (
        <AccountSettingsPanel />
      ) : activeTab === 'users' ? (
        <UsersSettingsPanel />
      ) : activeTab === 'organization' ? (
        <OrganizationSettingsPanel minioBaseUrl={minioBaseUrl} />
      ) : null}
    </div>
  )
}
