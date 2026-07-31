'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { ViewerSidebarPanel } from '../../../../../../ui/ViewerSidebar/Panel'

import { LocationSettings } from './src/LocationSettings'
import { MapCustomization } from './src/MapCustomization'

export function SettingsTab({ countryCode }: { countryCode?: string }) {
  return (
    <ViewerSidebarPanel variant="scroll">
      <MapCustomization />
      <LocationSettings countryCode={countryCode} />
    </ViewerSidebarPanel>
  )
}
