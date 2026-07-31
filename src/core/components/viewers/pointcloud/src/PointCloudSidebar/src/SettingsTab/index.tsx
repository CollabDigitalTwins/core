'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { ViewerSidebarPanel } from '../../../../../../ui/ViewerSidebar/Panel'

import { CameraSettings } from './src/CameraSettings'
import { GridManagement } from './src/GridManagement'
import { PerformanceSettings } from './src/PerformanceSettings'

export function SettingsTab() {
  return (
    <ViewerSidebarPanel variant="scroll">
      <PerformanceSettings />
      <CameraSettings />
      <GridManagement />
    </ViewerSidebarPanel>
  )
}
