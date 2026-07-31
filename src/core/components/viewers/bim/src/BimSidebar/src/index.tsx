'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../../store'
import { CommunicationTab } from '../../../../../ui/ViewerSidebar/CommunicationTab'
import { SensorsTab } from '../../../../../ui/ViewerSidebar/SensorsTab'
import { ViewerSidebarShell } from '../../../../../ui/ViewerSidebar/Shell'

import { FileTab } from './FileTab'
import { LayersTab } from './LayersTab'
import { SettingsTab } from './SettingsTab'
import { TopicsSection } from './Topics/src/TopicsSection'

import type { Organization } from '../../../../../../types/dbTypes'
import type { ViewerSidebarTab } from '../../../../../ui/ViewerSidebar/sidebarTabs'

export function BimSidebar({ minioBaseUrl, organization }: { minioBaseUrl?: string; organization?: Organization }) {
  const { state: bimState } = React.useContext(BimContext)
  const { modelId } = bimState.bim

  const tabs: ViewerSidebarTab[] = [
    { id: 'file', content: <FileTab /> },
    { id: 'layers', content: <LayersTab modelId={modelId} /> },
    // BCF topics sit above the comments in the BIM viewer only.
    { id: 'communication', content: <CommunicationTab topics={<TopicsSection />} /> },
    { id: 'sensors', content: <SensorsTab /> },
    { id: 'settings', content: <SettingsTab /> },
  ]

  return <ViewerSidebarShell tabs={tabs} organization={organization} />
}
