'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { Brush, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

import { formatInZone } from '../../../utils/timeUtils'
import { ChartContainer, type ChartConfig } from '../chart'

import { indicesForBounds, type RangeBounds } from './sensorRange'
import { mergeSeriesRows, rowsValueDomain } from './sensorSeriesRows'

import type { SensorSeries } from './sensorData'

/** How many series the tooltip lists before collapsing the tail into a count. */
const TOOLTIP_LIMIT = 8

const valueNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

export interface MultiSeriesEntry {
  id: number
  name: string
}

interface TooltipPayloadEntry {
  dataKey?: string | number | ((obj: unknown) => unknown)
  value?: unknown
}

interface SeriesTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: unknown
  nameById: Map<number, string>
  focusedId: number
  timeZone: string
  formatValue: (value: number) => string
  othersLabel: (count: number) => string
}

/**
 * Declared at module scope, not inline in the chart: a component defined during render is a new
 * type on every pass, so React would tear down and rebuild the tooltip subtree each time.
 */
function SeriesTooltip({
  active,
  payload,
  label,
  nameById,
  focusedId,
  timeZone,
  formatValue,
  othersLabel,
}: SeriesTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const entries = payload
    .filter(p => typeof p.value === 'number')
    .sort((a, b) => Number(b.value) - Number(a.value))
  const shown = entries.slice(0, TOOLTIP_LIMIT)
  const hidden = entries.length - shown.length

  return (
    <div className="rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-md">
      <div className="mb-1 font-medium">
        {formatInZone(Number(label), timeZone, {
          month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        })}
      </div>
      {shown.map(p => {
        const id = Number(p.dataKey)
        return (
          <div key={String(p.dataKey)} className="flex items-baseline justify-between gap-3">
            <span className={id === focusedId ? 'font-medium' : 'text-muted-foreground'}>
              {nameById.get(id) ?? String(p.dataKey)}
            </span>
            <span className="tabular-nums">{formatValue(Number(p.value))}</span>
          </div>
        )
      })}
      {hidden > 0 && <div className="mt-1 text-muted-foreground">{othersLabel(hidden)}</div>}
    </div>
  )
}

interface SensorMultiSeriesChartProps {
  sensors: MultiSeriesEntry[]
  seriesById: Map<number, SensorSeries>
  focusedId: number
  /** Click a line or a legend row to focus that sensor everywhere. */
  onFocus: (sensorId: number) => void
  /** Colour for the focused line, carrying its current value. Siblings are not coloured. */
  focusColour: string
  unit?: string
  valueLabels?: Record<number, string>
  timeZone: string
  emptyText: string
  othersLabel: (count: number) => string
  /** Window to show. `null` spans everything. Ignored unless `onBoundsChange` is supplied. */
  bounds?: RangeBounds | null
  /** Supplying this renders the brush. Dragging it reports the new window in milliseconds. */
  onBoundsChange?: (bounds: RangeBounds) => void
}

/**
 * Every sensor in scope over time, using the emphasis pattern: the focused sensor is the only
 * coloured line and the rest are recessive hairlines. That one colour is the focused sensor's
 * own value ramp colour, so the line matches its bar, its halo and the legend caret.
 *
 * Why not a colour per sensor: a type can hold dozens of sensors, and past a handful of hues
 * adjacent series stop being distinguishable (especially under colour-vision deficiency). Here
 * identity comes from the legend list, the hover lift and the shared tooltip rather than from
 * colour, so it holds at any series count. Clicking a line or a legend row re-focuses, which
 * also moves the marker halos and the viewer legend.
 */
export function SensorMultiSeriesChart({
  sensors,
  seriesById,
  focusedId,
  onFocus,
  focusColour,
  unit,
  valueLabels,
  timeZone,
  emptyText,
  othersLabel,
  bounds = null,
  onBoundsChange,
}: SensorMultiSeriesChartProps): React.ReactElement {
  const [hoveredId, setHoveredId] = React.useState<number | null>(null)

  const ids = sensors.map(s => s.id)
  const rows = React.useMemo(() => mergeSeriesRows(seriesById, ids), [seriesById, ids.join(',')])
  const valueDomain = rowsValueDomain(rows, ids)
  const nameById = new Map(sensors.map(s => [s.id, s.name]))

  // ChartContainer needs a config entry per key to size its CSS vars; colours come from the
  // Line props instead, since they depend on focus rather than identity.
  const chartConfig: ChartConfig = Object.fromEntries(
    sensors.map(s => [String(s.id), { label: s.name }]),
  )

  const formatValue = (value: number): string =>
    valueLabels?.[value] ?? `${valueNumber.format(value)}${unit ? ` ${unit}` : ''}`

  const formatAxis = (value: number): string =>
    formatInZone(Number(value), timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

  // Recharts renders `content` itself, so pass an element carrying the extra props; it merges
  // its own active/payload/label in.
  const renderTooltip = (
    <SeriesTooltip
      nameById={nameById}
      focusedId={focusedId}
      timeZone={timeZone}
      formatValue={formatValue}
      othersLabel={othersLabel}
    />
  )

  if (rows.length === 0) {
    return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{emptyText}</div>
  }

  const yDomain: [number, number] | undefined = valueDomain
    ? valueDomain.max > valueDomain.min
      ? [valueDomain.min, valueDomain.max]
      : [valueDomain.min - 1, valueDomain.max + 1]
    : undefined

  // The brush windows the merged rows, so a preset picked upstream and a drag down here are the
  // same operation expressed in two units: the caller works in times, recharts in row indices.
  const showBrush = onBoundsChange != null && rows.length > 1
  const brushRange = showBrush ? indicesForBounds(rows, bounds) : null
  const reportBounds = (range: { startIndex?: number; endIndex?: number }) => {
    const from = rows[range.startIndex ?? 0]?.t
    const to = rows[range.endIndex ?? rows.length - 1]?.t
    if (from == null || to == null) return
    onBoundsChange?.({ from, to })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="min-w-0 flex-1">
        <ChartContainer config={chartConfig} className={`w-full ${showBrush ? 'h-[300px]' : 'h-[260px]'}`}>
          <LineChart data={rows} margin={{ left: 0, right: 12, top: 10 }}>
            <CartesianGrid vertical={false} opacity={0.4} />
            <YAxis
              domain={yDomain}
              tickLine={false}
              axisLine={false}
              width={44}
              tickMargin={4}
              tick={{ fontSize: 11 }}
              tickFormatter={(value: number) => valueLabels?.[value] ?? valueNumber.format(value)}
            />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
              tickFormatter={formatAxis}
            />
            {/* One crosshair readout listing every series, so the pointer never has to land on
                a specific 1px line to read a value. */}
            <Tooltip content={renderTooltip} />
            {/* Transparent fat copies of every series, drawn under the real ones: a recessive
                line is a 1px path and all but unclickable, so this is what actually catches the
                pointer. `pointerEvents: stroke` hit-tests the widened stroke, not the fill. */}
            {sensors.map(sensor => (
              <Line
                key={`hit-${sensor.id}`}
                dataKey={String(sensor.id)}
                type="monotone"
                stroke="transparent"
                strokeWidth={12}
                dot={false}
                activeDot={false}
                connectNulls
                isAnimationActive={false}
                legendType="none"
                tooltipType="none"
                onClick={() => onFocus(sensor.id)}
                onMouseEnter={() => setHoveredId(sensor.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              />
            ))}
            {sensors.map(sensor => {
              const isFocused = sensor.id === focusedId
              const isHovered = sensor.id === hoveredId
              return (
                <Line
                  key={sensor.id}
                  dataKey={String(sensor.id)}
                  name={sensor.name}
                  type="monotone"
                  // Colour marks focus, never identity: see the component doc.
                  stroke={isFocused ? focusColour : 'hsl(var(--muted-foreground))'}
                  strokeWidth={isFocused ? 2 : isHovered ? 2 : 1}
                  strokeOpacity={isFocused ? 1 : isHovered ? 0.9 : 0.35}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                  onClick={() => onFocus(sensor.id)}
                  style={{ cursor: 'pointer' }}
                />
              )
            })}
            {showBrush && brushRange && (
              <Brush
                dataKey="t"
                height={22}
                travellerWidth={8}
                startIndex={brushRange.startIndex}
                endIndex={brushRange.endIndex}
                tickFormatter={(value) => formatAxis(Number(value))}
                onChange={(range) => reportBounds(range as { startIndex?: number; endIndex?: number })}
              />
            )}
          </LineChart>
        </ChartContainer>
      </div>

      {/* The dependable identity channel: names, not colours. */}
      <ul className="max-h-[260px] shrink-0 overflow-y-auto sm:w-44">
        {sensors.map(sensor => {
          const isFocused = sensor.id === focusedId
          return (
            <li key={sensor.id}>
              <button
                type="button"
                onClick={() => onFocus(sensor.id)}
                onMouseEnter={() => setHoveredId(sensor.id)}
                onMouseLeave={() => setHoveredId(null)}
                aria-current={isFocused}
                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-accent ${
                  isFocused ? 'font-medium' : 'text-muted-foreground'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-0.5 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: isFocused ? focusColour : 'hsl(var(--muted-foreground))',
                    opacity: isFocused ? 1 : 0.5,
                  }}
                />
                <span className="truncate">{sensor.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
