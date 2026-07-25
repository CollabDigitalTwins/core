'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { SensorsSection } from '../../../../../../ui/Sensors/SensorsSection'

import type { DbFile } from '../../../../../../../types/dbTypes'
export interface FileItem {
  task: DbFile
  icon: React.ElementType
  visible: boolean
}

export function SensorsTab() {
  return (
    <div className="flex-1 flex flex-col space-y-6 py-4 overflow-hidden">
      <SensorsSection />
    </div>
  )
}
