'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { BimContext } from '../../../../../../../../store'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'
import { useCameraNavigation } from '../../../../useCameraNavigation'

import type { NavigationMode as Mode } from '../../../../CameraNavigation'

const MODES: { id: Mode; icon: LR.LucideIcon }[] = [
  { id: 'Orbit', icon: LR.Orbit },
  { id: 'FirstPerson', icon: LR.PersonStanding },
]

export function NavigationMode() {
  const t = useTranslations('CameraSettings')

  const { state: bimState } = React.useContext(BimContext)
  const { world } = bimState.bim
  const { navigation, navState } = useCameraNavigation()

  // Projection changes elsewhere decide whether walk mode is offerable, so track them.
  const [isOrthographic, setIsOrthographic] = React.useState(false)
  React.useEffect(() => {
    const camera = world?.camera
    if (!(camera instanceof OBC.OrthoPerspectiveCamera)) return

    const sync = () => setIsOrthographic(camera.projection.current === 'Orthographic')
    sync()
    camera.projection.onChanged.add(sync)
    return () => camera.projection.onChanged.remove(sync)
  }, [world?.camera])

  if (!navigation || !navState) return null

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t('navigation')}</label>
      <Tabs
        value={navState.mode}
        onValueChange={(mode) => navigation.setMode(mode as Mode)}
        variant="switch"
      >
        <TabsList className="grid w-full grid-cols-2">
          {MODES.map(({ id, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              disabled={id === 'FirstPerson' && isOrthographic}
              title={id === 'FirstPerson' && isOrthographic ? t('firstPersonNeedsPerspective') : undefined}
            >
              <Icon className="w-4 h-4 mr-2" />
              {t(`mode_${id}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
