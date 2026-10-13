'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";

import { BimContext } from '../../../../../../../../store/BIM/context'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'
import { readBimLighting, refreshSunPlacement } from '../../../../lib/bimLighting'
import { modelBounds } from '../../../../lib/modelBounds'
import { applyRenderMode, readRenderMode } from '../../../../lib/renderMode'

import type { RenderModeName } from '../../../../lib/renderMode'

export function RenderMode() {
  const t = useTranslations('RenderMode')

  const { state: bimState } = React.useContext(BimContext)
  const { world, fragments, bimComponents } = bimState.bim

  const [renderMode, setRenderMode] = React.useState<RenderModeName>('Shadowed')

  React.useEffect(() => {
    if (!world) return
    setRenderMode(readRenderMode(world))
  }, [world])

  const handleCameraModeChange = (value: string) => {
    const mode = value as RenderModeName
    if (!(bimComponents && world)) return
    setRenderMode(mode)
    applyRenderMode(world, mode)
    refreshSunPlacement(world, modelBounds(bimComponents), readBimLighting(world))
    void fragments?.core.update(true)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t('renderModeTitle')}</label>
      <Tabs value={renderMode} onValueChange={handleCameraModeChange} variant="switch">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="Shadowed">
            <LR.Umbrella className="w-4 h-4 mr-2" />
            {t('shadowed')}
          </TabsTrigger>
          <TabsTrigger value="Basic">
            <LR.UmbrellaOff className="w-4 h-4 mr-2" />
            {t('basic')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
