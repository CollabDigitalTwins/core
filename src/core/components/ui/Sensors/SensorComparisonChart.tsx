'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { Bar, BarChart, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartContainer, type ChartConfig } from '../chart'

const valueNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

export interface ComparisonEntry {
  id: number
  name: string
  value: number
  /** Ramp colour for this value, so a bar matches its marker halo in the scene. */
  colour: string
}

/**
 * Declared at module scope, not inline in the chart: a component defined during render is a new
 * type on every pass, so React would tear down and rebuild the tooltip subtree each time.
 */
function BarTooltip({
  active,
  payload,
  formatValue,
}: {
  active?: boolean
  payload?: { payload?: ComparisonEntry }[]
  formatValue: (value: number) => string
}): React.ReactElement | null {
  const entry = payload?.[0]?.payload
  if (!active || !entry) return null
  return (
    <div className="rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-medium tabular-nums">{formatValue(entry.value)}</div>
      <div className="text-muted-foreground">{entry.name}</div>
    </div>
  )
}

interface SensorComparisonChartProps {
  entries: ComparisonEntry[]
  focusedId: number
  onFocus: (sensorId: number) => void
  unit?: string
  valueLabels?: Record<number, string>
  emptyText: string
}

/**
 * Current value of every sensor in scope, as horizontal bars sorted high to low.
 *
 * A bar chart rather than a pie: these are magnitudes to compare and often close together, and
 * angle judgements fail at both. Bar length is the primary channel; the fill repeats the value
 * ramp so a bar is recognisably the same colour as that sensor's halo out in the viewer, which
 * is the cross-reference the whole feature exists for.
 */
export function SensorComparisonChart({
  entries,
  focusedId,
  onFocus,
  unit,
  valueLabels,
  emptyText,
}: SensorComparisonChartProps): React.ReactElement {
  const sorted = React.useMemo(() => [...entries].sort((a, b) => b.value - a.value), [entries])

  const formatValue = (value: number): string =>
    valueLabels?.[value] ?? `${valueNumber.format(value)}${unit ? ` ${unit}` : ''}`

  if (sorted.length === 0) {
    return <div className="flex h-[140px] items-center justify-center text-sm text-muted-foreground">{emptyText}</div>
  }

  const chartConfig: ChartConfig = { value: { label: 'Value' } }
  // Grow with the row count instead of squeezing bars, and include room for the axis band.
  const height = Math.max(120, sorted.length * 34 + 28)

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ left: 0, right: 44, top: 4, bottom: 4 }}
        barCategoryGap={2}
      >
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={(value: number) => valueNumber.format(value)}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={110}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fillOpacity: 0.08 }}
          content={<BarTooltip formatValue={formatValue} />}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
          isAnimationActive={false}
          onClick={(data: unknown) => {
            const entry = (data as { payload?: ComparisonEntry })?.payload
            if (entry) onFocus(entry.id)
          }}
          style={{ cursor: 'pointer' }}
        >
          {sorted.map(entry => (
            <Cell
              key={entry.id}
              fill={entry.colour}
              // Focus reads as a ring on the bar, since fill already carries the value.
              stroke={entry.id === focusedId ? 'hsl(var(--foreground))' : undefined}
              strokeWidth={entry.id === focusedId ? 1.5 : 0}
            />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            className="fill-foreground"
            style={{ fontSize: 11 }}
            formatter={(value: number) => formatValue(value)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
