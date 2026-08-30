'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";

import { BimContext } from '../../../../../../../../store/BIM/context'
import { Button } from '../../../../../../../ui/Button'
import { ColorInput, Input } from '../../../../../../../ui/Input'
import { Slider, SliderWithInput } from '../../../../../../../ui/Slider'
import { Switch } from '../../../../../../../ui/Switch'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'
import { SettingsSection } from '../../../../../../../ui/ViewerSidebar/SettingsSection'
import { applyBimLighting, DEFAULT_BIM_LIGHTING, readBimLighting } from '../../../../lib/bimLighting'
import { modelBounds, projectNorthRotation } from '../../../../lib/modelBounds'
import { formatTimeOfDay, localInstant, sunPositionAt } from '../../../../lib/solarPosition'
import { useViewerLocation } from '../../../../lib/useViewerLocation'
import { SunPath } from '../../../../SunPath'

import type { BimLighting } from '../../../../lib/bimLighting'

const NOON_MINUTES = 12 * 60
const SHADOW_RESOLUTIONS = [512, 1024, 2048, 4096]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function LightingManagement() {
  const t = useTranslations('LightingManagement')

  const { state: bimState } = React.useContext(BimContext)
  const { world, bimComponents } = bimState.bim
  const { latitude, longitude, label, northOffset } = useViewerLocation()

  const [lighting, setLighting] = React.useState<BimLighting>(DEFAULT_BIM_LIGHTING)
  const [date, setDate] = React.useState(today)
  const [minutes, setMinutes] = React.useState(NOON_MINUTES)
  const [showPath, setShowPath] = React.useState(false)

  React.useEffect(() => {
    if (world) setLighting(readBimLighting(world))
  }, [world])

  const apply = React.useCallback((next: BimLighting) => {
    setLighting(next)
    applyBimLighting(world, next, modelBounds(bimComponents))
  }, [world, bimComponents])

  const update = (patch: Partial<BimLighting>) => apply({ ...lighting, ...patch })

  const sceneOffset = React.useCallback(
    () => northOffset + projectNorthRotation(bimComponents),
    [northOffset, bimComponents],
  )

  const applySun = React.useCallback((isoDate: string, minutesPastMidnight: number) => {
    const sun = sunPositionAt(localInstant(isoDate, minutesPastMidnight), latitude, longitude)
    // Map placement plus the model's own yaw, so turning the model turns the sun with it.
    apply({ ...lighting, azimuth: sun.azimuth + sceneOffset(), elevation: Math.max(sun.elevation, 0) })
  }, [apply, lighting, latitude, longitude, sceneOffset])

  React.useEffect(() => {
    applySun(date, minutes)
    // Depending on `lighting` here would re-fire on every intensity edit and re-place the sun.
  }, [date, minutes, latitude, longitude, northOffset])

  React.useEffect(() => {
    const path = bimComponents?.get(SunPath)
    if (!path) return
    path.setDay(date, latitude, longitude, sceneOffset())
    path.setVisible(showPath)
  }, [bimComponents, showPath, date, latitude, longitude, sceneOffset])

  React.useEffect(() => {
    bimComponents?.get(SunPath).setTime(minutes)
  }, [bimComponents, minutes])

  React.useEffect(() => {
    const path = bimComponents?.get(SunPath)
    if (!path) return
    const onDragged = (next: number) => setMinutes(next)
    path.onTimeChanged.add(onDragged)
    return () => path.onTimeChanged.remove(onDragged)
  }, [bimComponents])

  React.useEffect(() => {
    const controls = (world?.camera as unknown as { controls?: {
      addEventListener(type: string, handler: () => void): void
      removeEventListener(type: string, handler: () => void): void
    } })?.controls
    if (!controls) return

    const resync = () => applySun(date, minutes)
    controls.addEventListener('rest', resync)
    return () => controls.removeEventListener('rest', resync)
  }, [world, applySun, date, minutes])

  const belowHorizon = sunPositionAt(localInstant(date, minutes), latitude, longitude).elevation <= 0

  return (
    <SettingsSection
      icon={LR.Sun}
      title={t('lightingTitle')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-gray-500">{t('locationLabel')}: {label}</p>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('dateLabel')}</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <label className="font-medium">{t('timeOfDayLabel')}</label>
              <span className="tabular-nums text-gray-500">{formatTimeOfDay(minutes)}</span>
            </div>
            <Slider
              value={[minutes]}
              onValueChange={([next]) => setMinutes(next)}
              min={0}
              max={1439}
              step={5}
            />
          </div>
          <p className="text-xs text-gray-500">
            {t('azimuthLabel')} {Math.round((lighting.azimuth - sceneOffset() + 360) % 360)}° · {t('elevationLabel')} {Math.round(lighting.elevation)}°
          </p>
          {belowHorizon && <p className="text-xs text-amber-600">{t('belowHorizon')}</p>}

          <div className="flex items-center justify-between pt-1">
            <label className="text-sm font-medium">{t('showSunPath')}</label>
            <Switch checked={showPath} onCheckedChange={setShowPath} />
          </div>
        </div>

        <SliderWithInput
          label={t('sunIntensityLabel')}
          value={[lighting.sunIntensity]}
          onValueChange={([sunIntensity]) => update({ sunIntensity })}
          min={0}
          max={10}
          step={0.1}
        />

        <SliderWithInput
          label={t('ambientIntensityLabel')}
          value={[lighting.ambientIntensity]}
          onValueChange={([ambientIntensity]) => update({ ambientIntensity })}
          min={0}
          max={10}
          step={0.1}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('colorLabel')}</label>
          <div className="p-2 border rounded-md bg-white">
            <ColorInput
              value={lighting.color}
              onChange={e => update({ color: e.target.value })}
              defaultColor={DEFAULT_BIM_LIGHTING.color}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('shadowResolutionLabel')}</label>
          <Tabs
            value={String(lighting.shadowResolution)}
            onValueChange={value => update({ shadowResolution: Number(value) })}
            variant="switch"
          >
            <TabsList className="grid w-full grid-cols-4">
              {SHADOW_RESOLUTIONS.map(resolution => (
                <TabsTrigger key={resolution} value={String(resolution)}>{resolution}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Button variant="outline" size="sm" onClick={() => apply(DEFAULT_BIM_LIGHTING)}>
          {t('resetLabel')}
        </Button>
      </div>
    </SettingsSection>
  )
}
