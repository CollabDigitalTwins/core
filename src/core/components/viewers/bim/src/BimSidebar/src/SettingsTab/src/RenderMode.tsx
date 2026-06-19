'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { useTranslations } from 'next-intl'
import * as LR from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'
import { BimContext } from '../../../../../../../../store/BIM/context'
import * as OBC from '@thatopen/components'
import { GhostMode } from '../../../../GhostMode'

export function RenderMode() {
  // Translation
  type Modes = 'Shadowed' | 'Basic' | 'Ghost'
  const t = useTranslations('RenderMode')

  const [renderMode, setRenderMode] = React.useState<Modes>('Shadowed')
  const { state: bimState } = React.useContext(BimContext)
  const { world, bimComponents } = bimState.bim

  const handleCameraModeChange = (mode: Modes) => {
    if (!(bimComponents && world)) return
    setRenderMode(mode)

    const ghostMode = bimComponents.get(GhostMode)
    if (!ghostMode) return

    switch (mode) {
      case 'Shadowed':
        world.renderer.three.shadowMap.enabled = true;
        ghostMode.restoreModelMaterials()
        break
      case 'Basic':
        world.renderer.three.shadowMap.enabled = false;
        ghostMode.restoreModelMaterials()
        break
      case 'Ghost':
        ghostMode.setModelTransparent()
        break
      default:
        break;
    }

  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t('renderModeTitle')}</label>
      <Tabs value={renderMode} onValueChange={handleCameraModeChange} variant="switch">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="Shadowed">
            <LR.Umbrella className="w-4 h-4 mr-2" />
            {t('shadowed')}
          </TabsTrigger>
          <TabsTrigger value="Basic">
            <LR.UmbrellaOff className="w-4 h-4 mr-2" />
            {t('basic')}
          </TabsTrigger>
          <TabsTrigger value="Ghost">
            <LR.Ghost className="w-4 h-4 mr-2" />
            {t('ghost')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}