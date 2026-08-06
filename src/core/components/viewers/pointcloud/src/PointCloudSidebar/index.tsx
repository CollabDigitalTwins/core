'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { ViewerSidebarShell } from '../../../../../components/ui/ViewerSidebar/Shell'

import { FileTab } from './src/FileTab'
import { SettingsTab } from './src/SettingsTab'

import type { ViewerSidebarTab } from '../../../../../components/ui/ViewerSidebar/sidebarTabs'
import type { Organization } from '../../../../../types/dbTypes'

export function PointCloudSidebar({ pointcloudApiUrl, organization }: { pointcloudApiUrl?: string; organization?: Organization }) {
  const tabs: ViewerSidebarTab[] = [
    { id: 'file', content: <FileTab pointcloudApiUrl={pointcloudApiUrl} /> },
    { id: 'settings', content: <SettingsTab /> },
  ]

  return <ViewerSidebarShell tabs={tabs} organization={organization} />
}
