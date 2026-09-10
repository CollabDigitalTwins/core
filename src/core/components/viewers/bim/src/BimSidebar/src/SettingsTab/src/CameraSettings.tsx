'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { SettingsSection } from '../../../../../../../ui/ViewerSidebar/SettingsSection'

import { NavigationMode } from './NavigationMode'
import { RenderMode } from './RenderMode'
import { ToggleProjection } from './ToggleProjection'
import { WalkSettings } from './WalkSettings'

/** Everything about how the BIM scene is viewed: render mode, projection and navigation. */
export function CameraSettings() {
  const t = useTranslations('CameraSettings')

  return (
    <SettingsSection icon={LR.Camera} title={t('title')}>
      <div className="space-y-3 px-1 pb-2">
        <RenderMode />
        <ToggleProjection />
        <NavigationMode />
        <WalkSettings />
      </div>
    </SettingsSection>
  )
}
