'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { ViewerSidebarPanel } from '../../../../../../ui/ViewerSidebar/Panel'

import { GridManagement } from './src/GridManagement'
import { MeasurementSettings } from './src/MeasurementSettings'
import { PointCloudSettings } from './src/PointCloudSettings'
import { RenderMode } from './src/RenderMode'
import { ToggleProjection } from './src/ToggleProjection'

export function SettingsTab() {
  return (
    <ViewerSidebarPanel variant="scroll">
      <ToggleProjection />
      <RenderMode />
      <GridManagement />
      <MeasurementSettings />
      <PointCloudSettings />
      {/* LightingManagement (./src/LightingManagement) is built but not wired up yet. */}
    </ViewerSidebarPanel>
  )
}
