'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import { formatDuration } from '../../../utils/timeUtils'
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

import { defaultPalette } from './sensorUtils'

import type { SensorType } from '../../../types/dbTypes'

interface SensorChartProps {
  sensorData: { time: string; value: number }[]
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
  const gradientId = `gradient-${sensorName.replace(/\s+/g, '-').toLowerCase()}`

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
              margin={{ left: 12, right: 12, top: 10 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={finalMax} stopOpacity={0.8} />
                  <stop offset="50%" stopColor={finalMid} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={finalMin} stopOpacity={0.2} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.4} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                tickFormatter={(value) => {
                  if (value.endsWith(':00:00') || value.endsWith(':00')) {
                    return value.substring(0, value.lastIndexOf(':'))
                  }
                  return ''
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  unit || valueLabels ? (
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(value: unknown) => {
                        const label = valueLabels?.[value as number]
                        if (label) return label
                        return unit ? `${value} ${unit}` : String(value)
                      }}
                    />
                  ) : (
                    <ChartTooltipContent indicator="line" />
                  )
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