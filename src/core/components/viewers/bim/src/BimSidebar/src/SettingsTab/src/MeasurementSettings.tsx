'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { BimContext } from '../../../../../../../../store'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { ColorInput } from '../../../../../../../ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../../../ui/Select'
import { SliderWithInput } from '../../../../../../../ui/Slider'
import { BimMeasurementManager } from '../../../../BimMeasurements/BimMeasurementManager'
import { DEFAULT_MEASUREMENT_SETTINGS } from '../../../../BimMeasurements/measurementSettings'

import type {
  AngleUnits,
  AreaUnits,
  BimMeasurementSettings,
  LengthUnits,
  VolumeUnits,
} from '../../../../BimMeasurements/measurementSettings'

const LENGTH_UNITS: LengthUnits[] = ['mm', 'cm', 'm', 'km']
const AREA_UNITS: AreaUnits[] = ['mm2', 'cm2', 'm2', 'km2']
const VOLUME_UNITS: VolumeUnits[] = ['mm3', 'cm3', 'm3', 'km3']
const ANGLE_UNITS: AngleUnits[] = ['deg', 'rad']

/** Superscripts for display only; the values stay the library's unit strings. */
const UNIT_LABELS: Record<string, string> = {
  mm2: 'mm²', cm2: 'cm²', m2: 'm²', km2: 'km²',
  mm3: 'mm³', cm3: 'cm³', m3: 'm³', km3: 'km³',
  deg: '°', rad: 'rad',
}

const unitLabel = (unit: string) => UNIT_LABELS[unit] ?? unit

/**
 * Units, precision, colour and snap tuning for the four BIM measurement tools.
 *
 * Follows GridManagement's pattern: local React state is the source of truth for
 * the inputs, and each change is pushed straight onto the OBC component. There
 * is no store field, so the settings live as long as the viewer's Components
 * instance does.
 */
export function MeasurementSettings() {
  // Translation
  const t = useTranslations('MeasurementSettings')

  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const manager = bimComponents?.get(BimMeasurementManager)

  const [settings, setSettings] = React.useState<BimMeasurementSettings>(
    () => manager?.settings ?? { ...DEFAULT_MEASUREMENT_SETTINGS },
  )

  // Pick up the manager's own values once it exists. Without this the panel
  // would show defaults even if the manager had been reconfigured elsewhere.
  const [initialized, setInitialized] = React.useState(false)
  React.useEffect(() => {
    if (!manager || initialized) return
    setSettings(manager.settings)
    setInitialized(true)
  }, [manager, initialized])

  /** Applies one field to the manager and mirrors it into local state. */
  const update = React.useCallback(
    <K extends keyof BimMeasurementSettings>(key: K, value: BimMeasurementSettings[K]) => {
      setSettings(previous => {
        const next = { ...previous, [key]: value }
        if (manager) manager.settings = next
        return next
      })
    },
    [manager],
  )

  return (
    <CollapsibleSection title={t('title')} chevronPosition="left" defaultOpen={false}>
      <div className="space-y-4">
        {/* Line colour */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('lineColour')}</label>
          <div className="p-2 border rounded-md bg-white">
            <ColorInput
              value={settings.colour}
              onInput={e => update('colour', e.currentTarget.value)}
              defaultColor={DEFAULT_MEASUREMENT_SETTINGS.colour}
            />
          </div>
        </div>

        {/* Units, one selector per measurement kind */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('lengthUnits')}</label>
          <Select
            value={settings.lengthUnits}
            onValueChange={(value: string) => update('lengthUnits', value as LengthUnits)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LENGTH_UNITS.map(unit => (
                <SelectItem key={unit} value={unit}>{unitLabel(unit)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('areaUnits')}</label>
          <Select
            value={settings.areaUnits}
            onValueChange={(value: string) => update('areaUnits', value as AreaUnits)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AREA_UNITS.map(unit => (
                <SelectItem key={unit} value={unit}>{unitLabel(unit)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('volumeUnits')}</label>
          <Select
            value={settings.volumeUnits}
            onValueChange={(value: string) => update('volumeUnits', value as VolumeUnits)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VOLUME_UNITS.map(unit => (
                <SelectItem key={unit} value={unit}>{unitLabel(unit)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('angleUnits')}</label>
          <Select
            value={settings.angleUnits}
            onValueChange={(value: string) => update('angleUnits', value as AngleUnits)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ANGLE_UNITS.map(unit => (
                <SelectItem key={unit} value={unit}>{unitLabel(unit)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Decimal places on measurement labels */}
        <SliderWithInput
          label={t('precision')}
          value={[settings.rounding]}
          onValueChange={([value]) => update('rounding', value)}
          min={0}
          max={5}
          step={1}
        />

        {/*
          How close the cursor has to be for a vertex, edge or face to count as
          a snap candidate. Lower means fewer competing candidates and a marker
          that holds still; too low and nothing snaps.
        */}
        <SliderWithInput
          label={t('snapRange')}
          value={[settings.snapRange]}
          onValueChange={([value]) => update('snapRange', value)}
          min={0.05}
          max={2}
          step={0.05}
          unit="m"
        />

        {/* Size of the square snap marker that previews the next point */}
        <SliderWithInput
          label={t('markerSize')}
          value={[settings.markerSize]}
          onValueChange={([value]) => update('markerSize', value)}
          min={4}
          max={20}
          step={1}
          unit="px"
        />
      </div>
    </CollapsibleSection>
  )
}
