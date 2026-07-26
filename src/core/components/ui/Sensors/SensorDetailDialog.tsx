'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Radio } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useSensors } from '../../../hooks/sensors/sensors'
import { AppConfigContext, MenusContext } from '../../../store'
import { formatInZone } from '../../../utils/timeUtils'
import { AddItemDialog } from '../AddItemDialog'
import { Button } from '../Button'

import { SensorChart } from './SensorChart'
import { colourForValue, observedDomain, resolveDomain, resolveRamp } from './sensorColour'
import { SensorComparisonChart, type ComparisonEntry } from './SensorComparisonChart'
import { SensorMultiSeriesChart } from './SensorMultiSeriesChart'
import { indicesForBounds, rangeBounds, type RangePreset } from './sensorRange'
import { sensorsInScope, tagsForScope, type ScopeMode } from './sensorScope'
import { UNTAGGED_TAG } from './SensorsSection'
// TimeZoneSelect is intentionally not rendered for now (kept as a standalone component).
import { useSensorSeries } from './useSensorSeries'
import { latestValues, useSensorSeriesMulti } from './useSensorSeriesMulti'

import type { SensorSeriesMeta } from './sensorData'
import type { Sensor, SensorType } from '../../../types/dbTypes'
import type { ChartConfig } from '../chart'

const PRESET_KEYS: RangePreset[] = ['all', 'day', 'hour', 'custom']
const SCOPE_KEYS: ScopeMode[] = ['sensor', 'type', 'tag']

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '') return null
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-all">{children}</span>
    </div>
  )
}

function MetaLink({ href }: { href?: string }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
      {href}
    </a>
  )
}

function MetadataSection({ meta, timeZone }: { meta?: SensorSeriesMeta; timeZone: string }) {
  const t = useTranslations('SensorDetail')
  if (!meta || Object.keys(meta).length === 0) {
    return <p className="text-sm text-muted-foreground">{t('noMetadata')}</p>
  }
  const phenomenon = meta.phenomenonTime
    ?.split('/')
    .map(iso => formatInZone(Date.parse(iso), timeZone, { dateStyle: 'medium', timeStyle: 'short' }))
    .join('  →  ')
  return (
    <div className="divide-y">
      <MetaRow label={t('datastream')}>{meta.name}</MetaRow>
      <MetaRow label={t('description')}>{meta.description}</MetaRow>
      <MetaRow label={t('observationType')}>{meta.observationType}</MetaRow>
      <MetaRow label={t('observedProperty')}>{meta.observedProperty?.name}</MetaRow>
      <MetaRow label={t('propertyDefinition')}><MetaLink href={meta.observedProperty?.definition} /></MetaRow>
      <MetaRow label={t('unit')}>{meta.unit ? `${meta.unit.name ?? ''} ${meta.unit.symbol ? `(${meta.unit.symbol})` : ''}`.trim() : undefined}</MetaRow>
      <MetaRow label={t('unitDefinition')}><MetaLink href={meta.unit?.definition} /></MetaRow>
      <MetaRow label={t('phenomenonTime')}>{phenomenon}</MetaRow>
      <MetaRow label={t('observations')}>{meta.observationCount}</MetaRow>
      <MetaRow label={t('generator')}>{meta.properties?.generator as React.ReactNode}</MetaRow>
      <MetaRow label={t('seed')}>{meta.properties?.seed as React.ReactNode}</MetaRow>
      <MetaRow label={t('frequency')}>{meta.properties?.frequency as React.ReactNode}</MetaRow>
      <MetaRow label={t('sensorMetadata')}><MetaLink href={meta.sensor?.metadata} /></MetaRow>
      <MetaRow label={t('selfLink')}><MetaLink href={meta.selfLink} /></MetaRow>
    </div>
  )
}

export function SensorDetailDialog({
  open,
  onOpenChange,
  sensor,
  sensorType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sensor: Sensor
  sensorType?: SensorType
}): React.ReactElement {
  const t = useTranslations('SensorDetail')
  const { state } = React.useContext(AppConfigContext)
  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const timeZone = state.appConfig.displayTimeZone

  const { points, unit, valueLabels, meta, isLoading } = useSensorSeries(
    sensor.url ?? '',
    sensor.dataFormat,
    sensor.updateFrequency,
    { enabled: open },
  )

  const [preset, setPreset] = React.useState<RangePreset>('all')
  const [brush, setBrush] = React.useState<{ startIndex?: number; endIndex?: number }>({})
  const [scopeMode, setScopeMode] = React.useState<ScopeMode>('sensor')
  const [scopeTag, setScopeTag] = React.useState<string | null>(null)

  // When a preset is picked (not custom), derive brush indices from its bounds.
  React.useEffect(() => {
    if (preset === 'custom') return
    const bounds = rangeBounds(preset, points)
    setBrush(indicesForBounds(points, bounds))
  }, [preset, points])

  const { sensors } = useSensors()
  // Memoised on the resolved tag list, not the sensors array: SWR hands back a new array on every
  // revalidation, which would make the effect below fire on every render. Serialised as JSON
  // rather than joined, because tags are free text and could contain any separator.
  const tagsKey = JSON.stringify(tagsForScope(sensor, sensors))
  const availableTags = React.useMemo(() => JSON.parse(tagsKey) as string[], [tagsKey])

  // Default the tag picker to the first tag available rather than leaving it empty.
  React.useEffect(() => {
    if (scopeMode === 'tag' && scopeTag == null && availableTags.length > 0) {
      setScopeTag(availableTags[0])
    }
  }, [scopeMode, scopeTag, availableTags])

  const scoped = sensorsInScope(sensor, sensors, { mode: scopeMode, tag: scopeTag })
  const comparing = scopeMode !== 'sensor' && scoped.length > 1

  // Only fan out across siblings once the user actually asks to compare.
  const { seriesById } = useSensorSeriesMulti(scoped, { enabled: open && comparing })

  const ramp = resolveRamp(sensorType)
  const allPoints = comparing
    ? [...seriesById.values()].flatMap(s => s.points)
    : points
  const domain = resolveDomain(sensorType, observedDomain(allPoints))

  const comparisonEntries: ComparisonEntry[] = React.useMemo(() => {
    if (!domain) return []
    const nameById = new Map(scoped.map(s => [s.id, s.name]))
    return [...latestValues(seriesById)]
      .filter(([id]) => nameById.has(id))
      .map(([id, value]) => ({
        id,
        name: nameById.get(id) ?? String(id),
        value,
        colour: colourForValue(value, ramp, domain),
      }))
  }, [seriesById, domain, ramp, scoped.map(s => s.id).join(',')])

  const focusSensor = React.useCallback((sensorId: number) => {
    menusDispatch({ type: 'SET_FOCUSED_SENSOR_ID', payload: { sensorId } })
  }, [menusDispatch])

  const chartConfig: ChartConfig = { value: { label: sensorType?.name ?? t('value'), color: 'hsl(var(--chart-1))' } }
  const tagLabel = (tag: string) => (tag === UNTAGGED_TAG ? t('untagged') : tag)

  return (
    <AddItemDialog
      open={open}
      onOpenChange={onOpenChange}
      title={sensor.name}
      icon={Radio}
      contentClassName="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        {/* One filter row scoping everything below it, so the charts always agree. */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {PRESET_KEYS.map(key => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={preset === key ? 'default' : 'outline'}
                onClick={() => setPreset(key)}
              >
                {t(`range.${key}`)}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {SCOPE_KEYS.map(key => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={scopeMode === key ? 'default' : 'outline'}
                disabled={key === 'tag' && availableTags.length === 0}
                onClick={() => setScopeMode(key)}
              >
                {t(`scope.${key}`)}
              </Button>
            ))}
            {scopeMode === 'tag' && availableTags.length > 0 && (
              <select
                aria-label={t('scope.tag')}
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={scopeTag ?? availableTags[0]}
                onChange={e => setScopeTag(e.target.value)}
              >
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>{tagLabel(tag)}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {comparing ? (
          <>
            <div>
              <h4 className="mb-2 text-sm font-semibold">{t('overTime')}</h4>
              <SensorMultiSeriesChart
                sensors={scoped.map(s => ({ id: s.id, name: s.name }))}
                seriesById={seriesById}
                focusedId={sensor.id}
                onFocus={focusSensor}
                accentColour={ramp.max}
                unit={unit}
                valueLabels={valueLabels}
                timeZone={timeZone}
                emptyText={t('loading')}
                othersLabel={count => t('moreSeries', { count })}
              />
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">{t('currentValues')}</h4>
              <SensorComparisonChart
                entries={comparisonEntries}
                focusedId={sensor.id}
                onFocus={focusSensor}
                unit={unit}
                valueLabels={valueLabels}
                emptyText={t('loading')}
              />
            </div>
          </>
        ) : (
          <SensorChart
            sensorData={points}
            isLoadingData={isLoading}
            sensorName={sensor.name}
            sensorType={sensorType as SensorType}
            updateFrequency={sensor.updateFrequency}
            chartConfig={chartConfig}
            size="lg"
            unit={unit}
            valueLabels={valueLabels}
            timeZone={timeZone}
            showBrush
            brushStartIndex={brush.startIndex}
            brushEndIndex={brush.endIndex}
            onBrushChange={range => { setPreset('custom'); setBrush(range) }}
          />
        )}

        <div>
          <h4 className="mb-2 text-sm font-semibold">{t('metadata')}</h4>
          <MetadataSection meta={meta} timeZone={timeZone} />
        </div>
      </div>
    </AddItemDialog>
  )
}
