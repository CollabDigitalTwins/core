'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { SensorDataFormat } from '../../../types/dbTypes'
import { formatTimestamp } from '../../../utils/timeUtils'
import { Button } from '../Button'
import { Card } from '../Card'

import { SensorChart } from './SensorChart'
import { SensorTagsSection, type SensorTagsTranslations } from './SensorTagsSection'

import type { SensorType } from '../../../types/dbTypes';
import type { ChartConfig } from '../chart'

export type SensorProps = {
  sensorName: string
  sensorType: SensorType
  dataUrl: string
  dataFormat: SensorDataFormat | `${SensorDataFormat}`
  updateFrequency: number
  buildingId?: number
  sensorId?: number
  tags?: string[]
  tagsVariant?: 'edit' | 'read-only'
  tagsTranslations?: SensorTagsTranslations
  onAddTag?: (tag: string) => Promise<void>
  onDeleteTag?: (tag: string) => Promise<void>
  createdAt: string | Date
  onRemove?: () => void
  onClose?: () => void
  enableCollapse?: boolean
  defaultCollapsed?: boolean
  size?: 'sm' | 'md' | 'lg'
  highlight?: boolean
}

export default function Sensor({
  sensorName,
  sensorType,
  dataUrl,
  dataFormat,
  updateFrequency,
  createdAt,
  onRemove,
  onClose,
  enableCollapse = false,
  defaultCollapsed = false,
  size = 'md',
  highlight = false,
  sensorId,
  tags = [],
  tagsVariant = 'edit',
  tagsTranslations,
  onAddTag,
  onDeleteTag,
}: SensorProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [sensorData, setSensorData] = React.useState<{ time: string; value: number }[]>([])
  const [isLoadingData, setIsLoadingData] = React.useState(false)
  const lastTap = React.useRef(0)

  const sensorTypeNameFormatted = sensorType?.name?.replace(/_/g, ' ') || 'Other'
  const SensorIcon = LR[sensorType?.icon] || LR.Radio

  // Fetch sensor data
  React.useEffect(() => {
    const fetchData = async () => {
      if (!dataUrl || dataFormat !== SensorDataFormat.Csv) {
        return
      }

      setIsLoadingData(true)
      try {
        const response = await fetch(dataUrl)
        const text = await response.text()

        const lines = text.trim().split('\n')
        const data = lines.map((line) => {
          const [time, value] = line.split(',')
          return {
            time: time.trim(),
            value: parseFloat(value),
          }
        })

        setSensorData(data)
      } catch (error) {
        console.error('Failed to fetch sensor data:', error)
        setSensorData([])
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [dataUrl, dataFormat])

  const chartConfig: ChartConfig = {
    value: {
      label: 'Value',
      color: 'hsl(var(--chart-1))',
    },
  }

  const sizeStyles = {
    sm: {
      cardWidth: 'w-[280px]',
      cardPadding: 'px-2 py-2',
      iconSize: 'h-7 w-7',
      iconInnerSize: 'h-4 w-4',
      titleSize: 'text-xs',
      subtitleSize: 'text-[10px]',
      metaSize: 'text-[10px]',
      buttonSize: 'h-6 w-6',
      buttonIconSize: 'h-3 w-3',
      gap: 'gap-2',
      collapsedIconSize: 'h-8 w-8',
      collapsedIconInnerSize: 'h-4 w-4',
    },
    md: {
      cardWidth: 'w-[410px]',
      cardPadding: 'px-3 py-2.5',
      iconSize: 'h-9 w-9',
      iconInnerSize: 'h-5 w-5',
      titleSize: 'text-sm',
      subtitleSize: 'text-xs',
      metaSize: 'text-xs',
      buttonSize: 'h-7 w-7',
      buttonIconSize: 'h-4 w-4',
      gap: 'gap-3',
      collapsedIconSize: 'h-9 w-9',
      collapsedIconInnerSize: 'h-5 w-5',
    },
    lg: {
      cardWidth: 'w-[500px]',
      cardPadding: 'px-4 py-3',
      iconSize: 'h-11 w-11',
      iconInnerSize: 'h-6 w-6',
      titleSize: 'text-base',
      subtitleSize: 'text-sm',
      metaSize: 'text-sm',
      buttonSize: 'h-8 w-8',
      buttonIconSize: 'h-5 w-5',
      gap: 'gap-4',
      collapsedIconSize: 'h-11 w-11',
      collapsedIconInnerSize: 'h-6 w-6',
    },
  }

  const currentSize = sizeStyles[size]

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!enableCollapse) return
    e.stopPropagation()

    const now = performance.now()
    if (now - lastTap.current < 300) setIsCollapsed(v => !v)
    lastTap.current = now
  }

  if (enableCollapse && isCollapsed) {
    return (
      <div
        className={`${currentSize.collapsedIconSize} rounded-full shadow-md flex items-center justify-center flex-shrink-0 bg-primary pointer-events-auto`}
        onPointerDown={handlePointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation()
          setIsCollapsed(v => !v)
        }}
      >
        <SensorIcon className={`${currentSize.collapsedIconInnerSize} text-primary-foreground cursor-pointer`} />
      </div>
    )
  }

  return (
    <div
      className="relative inline-block group pointer-events-auto"
      title={enableCollapse ? 'Double click to collapse' : undefined}
      onPointerDown={handlePointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (enableCollapse) setIsCollapsed(v => !v)
        else onClose?.()
      }}
    >
      <Card className={`${currentSize.cardWidth} ${currentSize.cardPadding} shadow-md group-hover:shadow-lg transition-shadow duration-200`}>
        <div className={`flex items-start ${currentSize.gap}`}>
          <div className={`${currentSize.iconSize} rounded-full shadow-sm flex items-center justify-center select-none flex-shrink-0 bg-primary`}>
            <SensorIcon className={`${currentSize.iconInnerSize} text-primary-foreground`} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <span className={`font-semibold ${currentSize.titleSize} text-foreground leading-none truncate`}>
              {sensorName}
            </span>
            <span className={`${currentSize.subtitleSize} text-muted-foreground leading-none`}>
              {sensorTypeNameFormatted}
            </span>
          </div>

          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Remove sensor"
              className={`z-50 ${currentSize.buttonSize} shrink-0`}
              aria-label="Remove sensor"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
            >
              <LR.Trash2 className={currentSize.buttonIconSize} />
            </Button>
          )}
        </div>

        <div className="mb-2">
          <span className={`${currentSize.metaSize} text-muted-foreground`}>
            Created {formatTimestamp(createdAt)}
          </span>
        </div>

        <SensorChart
          sensorData={sensorData}
          isLoadingData={isLoadingData}
          sensorName={sensorName}
          sensorType={sensorType}
          updateFrequency={updateFrequency}
          chartConfig={chartConfig}
          size={size}
        />
        <SensorTagsSection
          tags={tags}
          variant={tagsVariant}
          onAdd={onAddTag}
          onDelete={onDeleteTag}
          translations={tagsTranslations}
        />
      </Card>
    </div>
  )
}
