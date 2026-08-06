'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { CommunicationTab } from '../../../../../ui/ViewerSidebar/CommunicationTab'
import { SensorsTab } from '../../../../../ui/ViewerSidebar/SensorsTab'
import { ViewerSidebarShell } from '../../../../../ui/ViewerSidebar/Shell'

import { FileTab } from './FileTab'
import { LayersTab } from './LayersTab'
import { SettingsTab } from './SettingsTab'
import { TopicsSection } from './Topics/src/TopicsSection'

import type { Organization } from '../../../../../../types/dbTypes'
import type { ViewerSidebarTab } from '../../../../../ui/ViewerSidebar/sidebarTabs'

export function BimSidebar({ organization }: { organization?: Organization }) {
  const tabs: ViewerSidebarTab[] = [
    { id: 'file', content: <FileTab /> },
    { id: 'layers', content: <LayersTab /> },
    { id: 'communication', content: <CommunicationTab topics={<TopicsSection />} /> },
    { id: 'sensors', content: <SensorsTab /> },
    { id: 'settings', content: <SettingsTab /> },
  ]

  return <ViewerSidebarShell tabs={tabs} organization={organization} />
}
