'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { CommunicationTab } from '../../../../../components/ui/ViewerSidebar/CommunicationTab'
import { SensorsTab } from '../../../../../components/ui/ViewerSidebar/SensorsTab'
import { ViewerSidebarShell } from '../../../../../components/ui/ViewerSidebar/Shell'
import { usePermissions } from '../../../../../store'

import { FileTab } from './src/FileTab'
import { LayersTab } from './src/LayersTab'
import { SettingsTab } from './src/SettingsTab'

import type { ViewerSidebarTab } from '../../../../../components/ui/ViewerSidebar/sidebarTabs'
import type { Organization } from '../../../../../types/dbTypes'

export function MapSidebar({ minioBaseUrl, martinBaseUrl, organization }: { minioBaseUrl?: string; martinBaseUrl?: string; organization?: Organization }) {
  // Permissions
  const { ability } = usePermissions()

  // `enabled: false` hides the tab outright. It used to stay in the strip and open
  // an empty panel, because the permission check guarded the body, not the button.
  const tabs: ViewerSidebarTab[] = [
    { id: 'file', content: <FileTab />, enabled: ability.can('read', 'File') },
    {
      id: 'layers',
      content: <LayersTab martinBaseUrl={martinBaseUrl} organization={organization} />,
      enabled: ability.can('read', 'File'),
    },
    { id: 'communication', content: <CommunicationTab />, enabled: ability.can('read', 'Comment') },
    { id: 'sensors', content: <SensorsTab />, enabled: ability.can('read', 'Sensor') },
    { id: 'settings', content: <SettingsTab countryCode={organization?.country} /> },
  ]

  return <ViewerSidebarShell tabs={tabs} organization={organization} />
}
