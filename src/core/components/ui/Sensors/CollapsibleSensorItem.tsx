'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useCoreHooks } from '../../../hooks/provider'
import { useUser } from '../../../hooks/users/users'
import { AppConfigContext } from '../../../store'
import { formatInZone } from '../../../utils/timeUtils'
import { cn } from '../../../utils/utils'
import { Avatar, AvatarFallback } from '../Avatar'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { CommentActionButtons } from '../Comments/CommentActionButtons'
import { UserAvatar } from '../UserAvatar'

import { SensorChart } from './SensorChart'
import { SensorDetailDialog } from './SensorDetailDialog'
import { SensorTagsSection } from './SensorTagsSection'
import { resolveLucideIcon } from './sensorUtils'
import { useSensorSeries } from './useSensorSeries'

import type { Sensor, SensorType } from '../../../types/dbTypes'
import type { ChartConfig } from '../chart'

type SensorAction = 'view' | 'edit' | 'delete' | 'reply'

interface CollapsibleSensorItemProps {
  sensor: Sensor
  sensorType: SensorType
  onAction?: (action: SensorAction, id: number) => void
  depth?: number
  isVisible?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function CollapsibleSensorItem({
  sensor,
  sensorType,
  onAction,
  depth = 0,
  isVisible = true,
  onMouseEnter,
  onMouseLeave,
}: CollapsibleSensorItemProps) {
  const t = useTranslations('SensorsSection')
  const [isExpanded, setIsExpanded] = React.useState(false)
  const { state: appConfigState } = React.useContext(AppConfigContext)
  const timeZone = appConfigState.appConfig.displayTimeZone
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [tagAddNonce, setTagAddNonce] = React.useState(0)
  const { points: sensorData, unit, valueLabels, isLoading: isLoadingData } =
    useSensorSeries(sensor.url ?? '', sensor.dataFormat, sensor.updateFrequency, { enabled: isExpanded })
  const prevVisibleRef = React.useRef(isVisible)

  const typeName = sensorType?.name.replace(/_/g, ' ') ?? 'Unknown'

  const SensorIcon = resolveLucideIcon(sensorType?.icon)

  // Auto-collapse when visibility turns off
  React.useEffect(() => {
    const prevVisible = prevVisibleRef.current

    if (prevVisible && !isVisible) {
      // Just turned invisible - collapse
      setIsExpanded(false)
    }

    prevVisibleRef.current = isVisible
  }, [isVisible])

  const chartConfig = {
    value: {
      label: typeName,
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig

  const user = useSession().data?.user

  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : ''

  const { user: author } = useUser(String(sensor.authorId))
  const authorName: string | undefined = author?.name ?? 'Unknown User'

  const { sensor: sensorHooks } = useCoreHooks()
  const { updateSensor } = sensorHooks.useSensor(sensor.id)

  const handleAddTag = async (tag: string) => {
    const currentTags = sensor.tags ?? []
    await updateSensor({ tags: [...currentTags, tag] })
  }

  const handleDeleteTag = async (tag: string) => {
    const currentTags = sensor.tags ?? []
    await updateSensor({ tags: currentTags.filter(t => t !== tag) })
  }

  return (
    <div
      className={cn(
        "border rounded-md overflow-hidden transition-opacity",
        indentClass,
        !isVisible && "opacity-70"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Sensor Header */}
      <div className="flex items-start justify-between p-3 hover:bg-accent/50 transition-colors">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 w-6 p-0 mt-1", !isVisible && "opacity-70")}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <LR.ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </Button>

          <div className={cn(
            "h-8 w-8 mt-1 rounded-full bg-primary flex items-center justify-center flex-shrink-0",
            !isVisible && "opacity-70 grayscale"
          )}>
            <SensorIcon className={cn("h-4 w-4 text-primary-foreground", !isVisible && "opacity-70")} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className={cn("text-sm font-medium", isVisible ? "text-foreground" : "text-muted-foreground")}>
                {sensor.name}
              </span>
              {sensor.updatedAt !== sensor.createdAt && (
                <Badge variant="outline" className="text-xs">
                  {t('edited')}
                </Badge>
              )}
            </div>
          </div>
        </div>
    </div>

      {/* Expanded Content */ }
  {
    isExpanded && (
      <div className="border-t bg-muted/30">
        <div className="p-4 space-y-4">
          {/* Sensor Information */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatInZone(new Date(sensor.createdAt).getTime(), timeZone, { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              <Badge variant="secondary" className="text-xs">
                {typeName}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <span className="ml-2 font-medium">{sensor.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Format:</span>
                <span className="ml-2 font-medium">{sensor.dataFormat}</span>
              </div>
            </div>

            {/* Author Information */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-muted-foreground text-sm">Author:</span>
              <Avatar className="h-5 w-5 rounded-full overflow-hidden">
                <UserAvatar imageFileId={author?.imageFileId} name={authorName} />
              </Avatar>
              <span className="text-sm font-medium">{authorName}</span>
            </div>
          </div>

          {/* Sensor Data Chart */}
          <SensorChart
            sensorData={sensorData}
            isLoadingData={isLoadingData}
            sensorName={sensor.name}
            sensorType={sensorType}
            updateFrequency={sensor.updateFrequency}
            chartConfig={chartConfig}
            unit={unit}
            valueLabels={valueLabels}
            timeZone={timeZone}
          />
        </div>
        <div>
            <SensorTagsSection
              tags={sensor.tags ?? []}
              onAdd={handleAddTag}
              onDelete={handleDeleteTag}
              openAddSignal={tagAddNonce}
              translations={{
                addTag: t('addTag'),
                removeTag: t('removeTag'),
                cancel: t('cancel'),
                newTagPlaceholder: t('newTagPlaceholder'),
              }}
            />
        </div>

      </div>
    )
  }
      {/* Card tools row (bottom), mirroring the comment card */}
      <div className={cn("flex items-center justify-end gap-0 border-t px-2 py-1", !isVisible && "opacity-70")}>
        <CommentActionButtons
          onExpand={() => setDetailOpen(true)}
          onTag={() => { setIsExpanded(true); setTagAddNonce(n => n + 1) }}
          onEdit={onAction && user?.id === String(sensor.authorId) ? () => onAction('edit', sensor.id) : undefined}
          onDelete={onAction && user?.id === String(sensor.authorId) ? () => onAction('delete', sensor.id) : undefined}
          buttonClassName="h-8 w-8"
          labels={{ expand: t('expandSensor'), tag: t('addTag'), edit: t('editSensor'), delete: t('deleteSensor') }}
        />
      </div>
      <SensorDetailDialog open={detailOpen} onOpenChange={setDetailOpen} sensor={sensor} sensorType={sensorType} />
    </div >
  )
}
