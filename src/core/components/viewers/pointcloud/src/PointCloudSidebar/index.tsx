'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { ViewerSidebarShell } from '../../../../../components/ui/ViewerSidebar/Shell'
import { usePluginViewerTabs } from '../../../../../plugins/host/usePluginViewerTabs'
import { ViewerNames } from '../../../../../types/dbTypes'

import { FileTab } from './src/FileTab'
import { SettingsTab } from './src/SettingsTab'

import type { ViewerSidebarTab } from '../../../../../components/ui/ViewerSidebar/sidebarTabs'
import type { Organization } from '../../../../../types/dbTypes'

export function PointCloudSidebar({ pointcloudApiUrl, organization }: { pointcloudApiUrl?: string; organization?: Organization }) {
  const pluginTabs = usePluginViewerTabs(ViewerNames.pointcloud)

  const tabs: ViewerSidebarTab[] = [
    { id: 'file', content: <FileTab pointcloudApiUrl={pointcloudApiUrl} /> },
    { id: 'settings', content: <SettingsTab /> },
    ...pluginTabs,
  ]

  return <ViewerSidebarShell tabs={tabs} organization={organization} />
}
