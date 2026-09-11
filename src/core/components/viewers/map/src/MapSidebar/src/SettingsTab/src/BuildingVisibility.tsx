'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { MapContext } from '../../../../../../../../store'
import { Switch } from '../../../../../../../ui/Switch'

export function BuildingVisibility() {
  const tMap = useTranslations('MapCustomization')
  const { dispatch: mapDispatch, state: mapState } = React.useContext(MapContext)
  const { show3dBuildings } = mapState.map

  const handleToggle = (checked: boolean) => {
    mapDispatch({ type: 'UPDATE_SHOW_3D_BUILDINGS', payload: { show3dBuildings: checked } })
  }

  return (
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-2 text-sm font-medium" htmlFor="show-3d-buildings">
        <LR.Building2 className="w-4 h-4" />
        {tMap('buildings3d')}
      </label>
      <Switch id="show-3d-buildings" checked={show3dBuildings} onCheckedChange={handleToggle} />
    </div>
  )
}
