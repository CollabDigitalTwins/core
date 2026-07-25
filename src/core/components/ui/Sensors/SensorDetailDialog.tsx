'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Radio } from 'lucide-react'
import * as React from 'react'

import { AppConfigContext } from '../../../store'
import { formatInZone } from '../../../utils/timeUtils'
import { AddItemDialog } from '../AddItemDialog'
import { Button } from '../Button'

import { indicesForBounds, rangeBounds, type RangePreset } from './sensorRange'
import { SensorChart } from './SensorChart'
// TimeZoneSelect is intentionally not rendered for now (kept as a standalone component).
import { useSensorSeries } from './useSensorSeries'

import type { SensorSeriesMeta } from './sensorData'
import type { Sensor, SensorType } from '../../../types/dbTypes'
import type { ChartConfig } from '../chart'

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'day', label: 'Last day' },
  { key: 'hour', label: 'Last hour' },
  { key: 'custom', label: 'Custom' },
]

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
  if (!meta || Object.keys(meta).length === 0) {
    return <p className="text-sm text-muted-foreground">No metadata available.</p>
  }
  const phenomenon = meta.phenomenonTime
    ?.split('/')
    .map(iso => formatInZone(Date.parse(iso), timeZone, { dateStyle: 'medium', timeStyle: 'short' }))
    .join('  →  ')
  return (
    <div className="divide-y">
      <MetaRow label="Datastream">{meta.name}</MetaRow>
      <MetaRow label="Description">{meta.description}</MetaRow>
      <MetaRow label="Observation type">{meta.observationType}</MetaRow>
      <MetaRow label="Observed property">{meta.observedProperty?.name}</MetaRow>
      <MetaRow label="Property definition"><MetaLink href={meta.observedProperty?.definition} /></MetaRow>
      <MetaRow label="Unit">{meta.unit ? `${meta.unit.name ?? ''} ${meta.unit.symbol ? `(${meta.unit.symbol})` : ''}`.trim() : undefined}</MetaRow>
      <MetaRow label="Unit definition"><MetaLink href={meta.unit?.definition} /></MetaRow>
      <MetaRow label="Phenomenon time">{phenomenon}</MetaRow>
      <MetaRow label="Observations">{meta.observationCount}</MetaRow>
      <MetaRow label="Generator">{meta.properties?.generator as React.ReactNode}</MetaRow>
      <MetaRow label="Seed">{meta.properties?.seed as React.ReactNode}</MetaRow>
      <MetaRow label="Frequency (ms)">{meta.properties?.frequency as React.ReactNode}</MetaRow>
      <MetaRow label="Sensor metadata"><MetaLink href={meta.sensor?.metadata} /></MetaRow>
      <MetaRow label="Self link"><MetaLink href={meta.selfLink} /></MetaRow>
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
  const { state } = React.useContext(AppConfigContext)
  const timeZone = state.appConfig.displayTimeZone

  const { points, unit, valueLabels, meta, isLoading } = useSensorSeries(
    sensor.url ?? '',
    sensor.dataFormat,
    sensor.updateFrequency,
    { enabled: open },
  )

  const [preset, setPreset] = React.useState<RangePreset>('all')
  const [brush, setBrush] = React.useState<{ startIndex?: number; endIndex?: number }>({})

  // When a preset is picked (not custom), derive brush indices from its bounds.
  React.useEffect(() => {
    if (preset === 'custom') return
    const bounds = rangeBounds(preset, points)
    setBrush(indicesForBounds(points, bounds))
  }, [preset, points])

  const chartConfig: ChartConfig = { value: { label: sensorType?.name ?? 'Value', color: 'hsl(var(--chart-1))' } }

  return (
    <AddItemDialog
      open={open}
      onOpenChange={onOpenChange}
      title={sensor.name}
      icon={Radio}
      contentClassName="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1">
          {PRESETS.map(p => (
            <Button
              key={p.key}
              type="button"
              size="sm"
              variant={preset === p.key ? 'default' : 'outline'}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>

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

        <div>
          <h4 className="mb-2 text-sm font-semibold">Metadata</h4>
          <MetadataSection meta={meta} timeZone={timeZone} />
        </div>
      </div>
    </AddItemDialog>
  )
}
