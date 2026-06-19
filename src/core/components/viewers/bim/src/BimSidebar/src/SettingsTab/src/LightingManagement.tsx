'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { useTranslations } from 'next-intl'
import { Slider } from '../../../../../../../ui/Slider'
import { ColorInput } from '../../../../../../../ui/Input'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'

export function LightingManagement() {
  // Translation
  const t = useTranslations('LightingManagement')

  const [lightingEnabled, setLightingEnabled] = React.useState(true)
  const [lightingDistance, setLightingDistance] = React.useState([500])
  const [lightingColor, setLightingColor] = React.useState('#F65234')

  return (
    <CollapsibleSection
      title={t('lightingTitle')}
      chevronPosition="left"
      switchVariant={{
        checked: lightingEnabled,
        onCheckedChange: setLightingEnabled,
        disabled: false,
      }}
      defaultOpen={false}
    >
      <div className="space-y-4">
        {/* Lighting Color */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${lightingEnabled ? '' : 'text-gray-400'}`}>{t('colorLabel')}</label>
          <div className={`p-2 border rounded-md ${lightingEnabled ? 'bg-white' : 'bg-gray-100'}`}>
            <ColorInput
              value={lightingColor}
              onChange={e => setLightingColor(e.target.value)}
              disabled={!lightingEnabled}
            />
          </div>
        </div>

        {/* Lighting Distance */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label className={`font-medium ${lightingEnabled ? '' : 'text-gray-400'}`}>{t('distanceLabel')}</label>
            <span className={`${lightingEnabled ? 'text-gray-500' : 'text-gray-400'}`}>{lightingDistance[0]}</span>
          </div>
          <Slider
            value={lightingDistance}
            onValueChange={setLightingDistance}
            max={1000}
            min={0}
            step={10}
            disabled={!lightingEnabled}
          />
        </div>
      </div>
    </CollapsibleSection>
  )
}