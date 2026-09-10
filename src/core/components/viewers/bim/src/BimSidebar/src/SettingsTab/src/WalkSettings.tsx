'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Input } from '../../../../../../../ui/Input'
import { Label } from '../../../../../../../ui/Label'
import { SliderWithInput } from '../../../../../../../ui/Slider'
import { Switch } from '../../../../../../../ui/Switch'
import { MAX_MOVE_SPEED, MIN_MOVE_SPEED } from '../../../../CameraNavigation'
import { useCameraNavigation } from '../../../../useCameraNavigation'

const ELEVATION_STEP = 0.5

/** Walk speed and the elevation lock. Only meaningful while first person is the mode. */
export function WalkSettings() {
  const t = useTranslations('CameraSettings')
  const { navigation, navState } = useCameraNavigation()

  const [elevation, setElevation] = React.useState<number | null>(null)
  // Held while the field has focus so a live camera update cannot rewrite what is being typed.
  const [draft, setDraft] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!navigation) return
    setElevation(navigation.elevation)
    const publish = (metres: number) => setElevation(metres)
    navigation.onElevationChanged.add(publish)
    return () => navigation.onElevationChanged.remove(publish)
  }, [navigation])

  const commitElevation = React.useCallback((value: string) => {
    setDraft(null)
    const metres = Number.parseFloat(value)
    if (Number.isFinite(metres)) navigation?.setElevation(metres)
  }, [navigation])

  if (!navigation || navState?.mode !== 'FirstPerson') return null

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t('walkHint')}</p>

      <SliderWithInput
        label={t('moveSpeed')}
        value={[navState.moveSpeed]}
        onValueChange={([moveSpeed]) => navigation.setMoveSpeed(moveSpeed)}
        min={MIN_MOVE_SPEED}
        max={MAX_MOVE_SPEED}
        step={1}
      />

      <div className="flex justify-between items-center text-sm">
        <Label htmlFor="camera-elevation" className="font-medium">{t('lockElevationAt')}</Label>
        <div className="flex items-center space-x-1">
          <Input
            id="camera-elevation"
            type="number"
            step={ELEVATION_STEP}
            className="w-20 h-6 text-xs"
            value={draft ?? (elevation === null ? '' : elevation.toFixed(2))}
            onChange={(event) => {
              setDraft(event.target.value)
              // Committed as typed so the spinner arrows move the camera on the first click.
              const metres = Number.parseFloat(event.target.value)
              if (Number.isFinite(metres)) navigation.setElevation(metres)
            }}
            onBlur={(event) => commitElevation(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitElevation(event.currentTarget.value)
            }}
          />
          <span className="text-xs text-gray-500">{t('metres')}</span>
          <Switch
            aria-label={t('lockElevation')}
            checked={navState.lockElevation}
            onCheckedChange={(lockElevation) => navigation.setLockElevation(lockElevation)}
          />
        </div>
      </div>
    </div>
  )
}
