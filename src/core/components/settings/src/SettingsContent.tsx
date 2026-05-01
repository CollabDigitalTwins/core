"use client"

import AccountSettingsPanel from './AccountSettingsPanel'
import UsersSettingsPanel from './UsersSettingsPanel'
import OrganizationSettingsPanel from './OrganizationSettingsPanel'
import type { SettingsTabKey } from './types'

type SettingsContentProps = {
  activeTab: SettingsTabKey
}

export default function SettingsContent({ activeTab }: SettingsContentProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6">
      {activeTab === 'account' ? (
        <AccountSettingsPanel />
      ) : activeTab === 'users' ? (
        <UsersSettingsPanel />
      ) : activeTab === 'organization' ? (
        <OrganizationSettingsPanel />
      ) : null}
    </div>
  )
}
