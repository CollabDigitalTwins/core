'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { SensorsSection } from '../Sensors/SensorsSection'

import { ViewerSidebarPanel } from './Panel'

/** Sensors tab. Identical for every viewer — `SensorsSection` reads the active viewer itself. */
export function SensorsTab() {
  return (
    <ViewerSidebarPanel>
      <SensorsSection />
    </ViewerSidebarPanel>
  )
}
