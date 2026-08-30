'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";

import { BimContext } from '../../../../../../../../store/BIM/context'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'
import { GhostMode } from '../../../../GhostMode'
import { readBimLighting, refreshSunPlacement } from '../../../../lib/bimLighting'
import { modelBounds } from '../../../../lib/modelBounds'
import { applyRenderMode, readRenderMode } from '../../../../lib/renderMode'

import type { RenderModeName } from '../../../../lib/renderMode'

type Mode = RenderModeName | 'Ghost'

export function RenderMode() {
  const t = useTranslations('RenderMode')

  const { state: bimState } = React.useContext(BimContext)
  const { world, fragments, bimComponents } = bimState.bim

  const [renderMode, setRenderMode] = React.useState<Mode>('Shadowed')
  const baseMode = React.useRef<RenderModeName>('Shadowed')

  React.useEffect(() => {
    if (!world) return
    const current = readRenderMode(world)
    baseMode.current = current
    setRenderMode(current)
  }, [world])

  const handleCameraModeChange = (value: string) => {
    const mode = value as Mode
    if (!(bimComponents && world)) return
    setRenderMode(mode)

    if (mode !== 'Ghost') baseMode.current = mode

    const ghostMode = bimComponents.get(GhostMode)
    if (mode === 'Ghost') ghostMode?.setModelTransparent()
    else ghostMode?.restoreModelMaterials()

    applyRenderMode(world, baseMode.current)
    refreshSunPlacement(world, modelBounds(bimComponents), readBimLighting(world))
    void fragments?.core.update(true)
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
