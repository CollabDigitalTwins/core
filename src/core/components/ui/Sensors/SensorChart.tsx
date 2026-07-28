'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'
import { Area, AreaChart, Brush, CartesianGrid, XAxis, YAxis } from 'recharts'

import { detectTimeZone, formatInZone, formatDuration } from '../../../utils/timeUtils'
import { toDisplayString } from '../../../utils/utils'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../Card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../chart'

import {
  gradientStopsForYDomain,
  observedDomain,
  resolveDomain,
  type ColourDomain,
} from './sensorColour'
import { defaultPalette } from './sensorUtils'

import type { SensorType } from '../../../types/dbTypes'

/** Axis ticks: thousands-separated, at most one decimal, so the column stays narrow. */
const tickNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

interface SensorChartProps {
  sensorData: { t: number; value: number }[]
  isLoadingData: boolean
  sensorName: string
  sensorType: SensorType
  updateFrequency: number
  chartConfig: ChartConfig
  size?: 'sm' | 'md' | 'lg'
  sensorTitle?: string
  loadingText?: string
  noDataText?: string
  updateFrequencyText?: string
  dataPointsText?: string
  minColor?: string
  midColor?: string
  maxColor?: string
  unit?: string
  valueLabels?: Record<number, string>
  timeZone?: string
  showBrush?: boolean
  brushStartIndex?: number
  brushEndIndex?: number
  onBrushChange?: (range: { startIndex?: number; endIndex?: number }) => void
}

export function SensorChart({
  sensorData,
  isLoadingData,
  sensorName,
  sensorType,
  updateFrequency,
  chartConfig,
  size = 'md',
  sensorTitle = 'Sensor Data',
  loadingText = 'Loading data...',
  noDataText = 'No data available',
  updateFrequencyText = 'Update Frequency',
  dataPointsText = 'Data Points',
  minColor,
  midColor,
  maxColor,
  unit,
  valueLabels,
  timeZone = detectTimeZone(),
  showBrush = false,
  brushStartIndex,
  brushEndIndex,
  onBrushChange,
}: SensorChartProps) {

    const { maxColour, midColour, minColour } = sensorType || { name: 'Unknown', icon: 'Radio' }

  const finalMin = minColor || minColour || defaultPalette.min
  const finalMid = midColor || midColour || defaultPalette.mid
  const finalMax = maxColor || maxColour  || defaultPalette.max

  const sizeClasses = {
    sm: { height: 'h-[150px]', titleSize: 'text-sm', descSize: 'text-xs', footerSize: 'text-xs' },
    md: { height: 'h-[200px]', titleSize: 'text-base', descSize: 'text-sm', footerSize: 'text-sm' },
    lg: { height: 'h-[300px]', titleSize: 'text-lg', descSize: 'text-base', footerSize: 'text-sm' }
  }

  const currentSize = sizeClasses[size]
  // Derived from useId, not the sensor name: two sensors can share a name, and a duplicate
  // gradient id makes one chart silently adopt the other's colours.
  const gradientId = `sensor-gradient-${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const observed = observedDomain(sensorData)
  const colourDomain = resolveDomain(sensorType, observed)

  // The plot box spans the data's own range so variation stays visible, with a guard so a flat
  // series still gets a box with height. This is also what the gradient is projected onto.
  const yDomain: ColourDomain | null = !observed
    ? null
    : observed.max > observed.min
      ? observed
      : { min: observed.min - 1, max: observed.max + 1 }

  // Value-truthful stops when the type has a colour domain; otherwise keep the original
  // decorative top-to-bottom wash so an unconfigured type looks exactly as it did before.
  const valueStops = colourDomain && yDomain
    ? gradientStopsForYDomain({ min: finalMin, mid: finalMid, max: finalMax }, colourDomain, yDomain)
    : null

  // All axis/tooltip time strings are formatted in the caller's chosen zone.
  const axisOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
  const fullOpts: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
  const formatAxis = (value: number) => formatInZone(Number(value), timeZone, axisOpts)
  const formatFull = (value: number) => formatInZone(Number(value), timeZone, fullOpts)

  return (
    <Card>
      <CardHeader>
        <CardTitle className={currentSize.titleSize}>{sensorTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingData ? (
          <div className={`flex items-center justify-center ${currentSize.height} text-muted-foreground`}>
            <LR.Loader2 className="h-6 w-6 animate-spin mr-2" />
            {loadingText}
          </div>
        ) : sensorData.length === 0 ? (
          <div className={`flex items-center justify-center ${currentSize.height} text-muted-foreground`}>
            {noDataText}
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={sensorData}
              // The YAxis now supplies the left gutter, so no extra left margin.
              margin={{ left: 0, right: 12, top: 10 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  {valueStops
                    ? valueStops.map((stop, i) => (
                        <stop
                          key={`${stop.offset}-${i}`}
                          offset={`${stop.offset * 100}%`}
                          stopColor={stop.colour}
                          stopOpacity={0.55}
                        />
                      ))
                    : (
                      <>
                        <stop offset="5%" stopColor={finalMax} stopOpacity={0.8} />
                        <stop offset="50%" stopColor={finalMid} stopOpacity={0.5} />
                        <stop offset="95%" stopColor={finalMin} stopOpacity={0.2} />
                      </>
                    )}
                </linearGradient>
              </defs>

              {/* Solid hairline: a dashed grid reads as a threshold or projection when it is
                  just a grid. */}
              <CartesianGrid vertical={false} opacity={0.4} />
              <YAxis
                domain={yDomain ? [yDomain.min, yDomain.max] : undefined}
                tickLine={false}
                axisLine={false}
                width={44}
                tickMargin={4}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: number) => valueLabels?.[value] ?? tickNumber.format(value)}
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
                tickFormatter={formatAxis}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    // "dot" (not "line") so the time label renders at the top of the tooltip:
                    // with a single series + "line", ChartTooltipContent nests the label inside the
                    // per-item row, which the unit/category formatter branch then skips.
                    indicator="dot"
                    labelFormatter={(_label, payload) => {
                      const t = (payload?.[0]?.payload as { t?: number } | undefined)?.t
                      return t != null ? formatFull(t) : ''
                    }}
                    formatter={
                      unit || valueLabels
                        ? (value: unknown) => {
                            const label = valueLabels?.[value as number]
                            if (label) return label
                            return unit ? `${toDisplayString(value)} ${unit}` : toDisplayString(value)
                          }
                        : undefined
                    }
                  />
                }
              />
              <Area
                dataKey="value"
                type="natural"
                fill={`url(#${gradientId})`}
                stroke={finalMax}
                strokeWidth={1}
                fillOpacity={1}
              />
              {showBrush && sensorData.length > 1 && (
                <Brush
                  dataKey="t"
                  height={26}
                  travellerWidth={8}
                  startIndex={brushStartIndex}
                  endIndex={brushEndIndex}
                  tickFormatter={(value) => formatAxis(Number(value))}
                  onChange={(range) => onBrushChange?.(range as { startIndex?: number; endIndex?: number })}
                />
              )}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        <div className={`flex w-full items-start gap-2 ${currentSize.footerSize}`}>
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              <LR.Timer className="h-4 w-4" />
              {updateFrequencyText} {formatDuration(updateFrequency)}
            </div>
            {sensorData.length > 0 && (
              <div className="flex items-center gap-2 leading-none text-muted-foreground">
                <LR.Database className="h-4 w-4" />
                {sensorData.length} {dataPointsText}{unit ? ` · ${unit}` : ''}
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
