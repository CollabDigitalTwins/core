'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { useTranslations } from 'next-intl'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../../ui/Select'
import { ToggleProjection } from './src/ToggleProjection'
import { GridManagement } from './src/GridManagement'
import { LightingManagement } from './src/LightingManagement'
import { RenderMode } from './src/RenderMode'

export function SettingsTab() {
  // Translation
  const t = useTranslations('SettingsTab')

  const [accountActivity, setAccountActivity] = React.useState('all')

  return (
    <div className="w-full h-full flex flex-col gap-6 p-4 overflow-y-auto point">
      <ToggleProjection />
      <RenderMode />
      <GridManagement />
      {/* <LightingManagement /> */}
    </div>
  )
}