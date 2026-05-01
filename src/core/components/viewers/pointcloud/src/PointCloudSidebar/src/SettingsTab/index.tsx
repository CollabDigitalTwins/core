'use client'

import * as React from "react";
import { useTranslations } from 'next-intl'
import { GridManagement } from './src/GridManagement'
import { PerformanceSettings } from './src/PerformanceSettings'
import { CameraSettings } from './src/CameraSettings'

export function SettingsTab() {
  // Translation
  const t = useTranslations('SettingsTab')

  return (
    <div className="w-full h-full flex flex-col gap-6 p-4 overflow-y-auto point">
      <PerformanceSettings />
      <CameraSettings />
      <GridManagement />
    </div>
  )
}