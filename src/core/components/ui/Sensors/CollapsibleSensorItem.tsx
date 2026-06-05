'use client'

import * as React from 'react'
import { Button } from '../Button'
import { Badge } from '../Badge'
import { Avatar, AvatarFallback } from '../Avatar'
import { UserAvatar } from '../UserAvatar'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { cn } from '../../../utils/utils'
import { Sensor, SensorType } from '../../../types/dbTypes'
import { useUser } from '../../../hooks/users/users'
import { useCoreHooks } from '../../../hooks/provider'
import { useSession } from 'next-auth/react'
import { SensorChart } from './SensorChart'
import { SensorTagsSection } from './SensorTagsSection'
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
  onMouseLeave
}: CollapsibleSensorItemProps) {
  const t = useTranslations('SensorsSection')
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [sensorData, setSensorData] = React.useState<{ time: string; value: number }[]>([])
  const [isLoadingData, setIsLoadingData] = React.useState(false)
  const prevVisibleRef = React.useRef(isVisible)

  const dataPath = `${process.env.NEXT_PUBLIC_MINIO_BUCKET_URL}/sensors/${sensor.url}`

  const typeIcon  = sensorType?.icon || 'Radio'
  const typeName = sensorType?.name.replace(/_/g, ' ') ?? 'Unknown'    

  const SensorIcon = LR[typeIcon] || LR.Radio

  // Auto-collapse when visibility turns off
  React.useEffect(() => {
    const prevVisible = prevVisibleRef.current
    
    if (prevVisible && !isVisible) {
      // Just turned invisible - collapse
      setIsExpanded(false)
    }
    
    prevVisibleRef.current = isVisible
  }, [isVisible])

  // Fetch and parse CSV data
  React.useEffect(() => {
    const fetchCSVData = async () => {
      setIsLoadingData(true)
      try {
        const response = await fetch(dataPath)
        const csvText = await response.text()
        
        // Parse CSV: format is "time,value" (e.g., "0:00:00,7.4")
        const lines = csvText.trim().split('\n')
        const parsed = lines.map(line => {
          const [time, valueStr] = line.split(',')
          return {
            time: time.trim(),
            value: parseFloat(valueStr.trim())
          }
        }).filter(item => !isNaN(item.value)) // Filter out any invalid entries
        
        setSensorData(parsed)
      } catch (error) {
        console.error('Error fetching sensor data:', error)
        // Fallback to empty array on error
        setSensorData([])
      } finally {
        setIsLoadingData(false)
      }
    }

    if (isExpanded) {
      fetchCSVData()
    }
  }, [dataPath, isExpanded])

  const chartConfig = {
    value: {
      label: typeName,
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig

  const user = useSession().data?.user

  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : ''

  const { user: author } = useUser(String(sensor.authorId))
  let authorName: string | undefined = author?.name ?? 'Unknown User'

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

      {/* Action Buttons */}
      {onAction && (
        <div className={cn("flex items-center gap-0 flex-shrink-0", !isVisible && "opacity-70")}>
          {user?.id === String(sensor.authorId) && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0"
                onClick={() => onAction('edit', sensor.id)}
                title={t('editSensor')}
              >
                <LR.Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0"
                onClick={() => onAction('delete', sensor.id)}
                title={t('deleteSensor')}
              >
                <LR.Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
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
                {format(new Date(sensor.createdAt), 'PPp')}
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
          />
        </div>
        <div>
            <SensorTagsSection
              tags={sensor.tags ?? []}
              onAdd={handleAddTag}
              onDelete={handleDeleteTag}
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
    </div >
  )
}
