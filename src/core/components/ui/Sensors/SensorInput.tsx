'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Radio } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useCreateSensor, useSensor } from '../../../hooks/sensors/sensors'
import { useSensorTypes } from '../../../hooks/sensorTypes/sensorTypes'
import { AppConfigContext, MapContext, BuildingsContext, MenusContext, ToolsContext } from '../../../store'
import { ViewerNames, SensorDataFormat } from '../../../types/dbTypes'
import { frequencyUnits } from '../../../utils/timeUtils'
import { cn } from '../../../utils/utils'
import { AddItemDialog } from '../AddItemDialog'
import { Button } from '../Button'
import { Input } from '../Input'
import { Label } from '../Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../Select'
import { Separator } from '../Separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../Tooltip'

import { parseSensorSeries } from './sensorData'
import { SensorTagsSection } from './SensorTagsSection'

import type { Sensor} from '../../../types/dbTypes';



export type SensorInputLayout = 'inline' | 'dialog'

export type BimSensorPlacementContext = {
  world: any
  raycast: (data: { camera: any; mouse: any; dom: any }) => Promise<any>
  buildingId?: number
  setCursor?: (cursor: string) => void
  addPendingMarker?: (position: { x: number; y: number; z: number }) => number
  removePendingMarker?: (id: number) => void
}

export type SensorInputProps = {
  viewer: ViewerNames
  layout?: SensorInputLayout
  onCancel?: () => void
  bim?: BimSensorPlacementContext
  isOpen?: boolean
  /** When provided, the dialog becomes a single-sensor EDIT form (no multi-add, no placement). */
  editSensor?: Sensor
  /** Called after a successful edit save (in addition to onCancel). */
  onSaved?: () => void
}

type SensorFormData = {
  typeId: number
  name: string
  data: string
  dataFormat: string
  updateFrequency: number
  updateFrequencyUnit: number
  tags: string[]
}

/**
 * Split a stored updateFrequency (ms) back into a {value, unit} pair for the form,
 * picking the largest frequencyUnits entry that divides evenly. Falls back to
 * expressing the value in milliseconds.
 */
function splitUpdateFrequencyMs(updateFrequencyMs: number): { updateFrequency: number; updateFrequencyUnit: number } {
  const sortedDesc = [...frequencyUnits].sort((a, b) => b.value - a.value)
  for (const unit of sortedDesc) {
    if (unit.value > 0 && updateFrequencyMs % unit.value === 0) {
      return { updateFrequency: updateFrequencyMs / unit.value, updateFrequencyUnit: unit.value }
    }
  }
  return { updateFrequency: updateFrequencyMs, updateFrequencyUnit: 1 }
}

function sensorFormFromEditSensor(editSensor: Sensor): SensorFormData {
  const { updateFrequency, updateFrequencyUnit } = splitUpdateFrequencyMs(editSensor.updateFrequency)
  return {
    typeId: editSensor.typeId ?? -1,
    name: editSensor.name,
    data: editSensor.url ?? editSensor.data ?? '',
    dataFormat: editSensor.dataFormat,
    updateFrequency,
    updateFrequencyUnit,
    tags: editSensor.tags ?? [],
  }
}

export function SensorInput({
  viewer,
  layout = 'dialog',
  onCancel,
  bim,
  isOpen = false,
  editSensor,
  onSaved,
}: SensorInputProps) {
  const t = useTranslations('SensorInput')
  // Fallback for i18n keys that may not exist yet in every catalog (edit-mode additions).
  const tf = React.useCallback((key: string, fallback: string) => (t.has(key) ? t(key) : fallback), [t])
  const session = useSession()

  const user = session.data?.user
  const organizationId = user?.organizationId
  const authorId = session.data?.user?.id || -1

  const { state: appConfigState } = React.useContext(AppConfigContext)
  const mapContext = React.useContext(MapContext)

  const { state: buildingsState } = React.useContext(BuildingsContext)
  const buildingId = buildingsState?.buildings?.building?.id || -1

  const { state: toolsState } = React.useContext(ToolsContext)

  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const { currentSensorTypeId } = menusState.menus

  const [sensors, setSensors] = React.useState<SensorFormData[]>([
    editSensor
      ? sensorFormFromEditSensor(editSensor)
      : {
        typeId: currentSensorTypeId ?? -1,
        name: '',
        data: '',
        dataFormat: SensorDataFormat.Json,
        updateFrequency: 1,
        updateFrequencyUnit: 1000,
        tags: [],
      },
  ])
  const [currentSensorIndex, setCurrentSensorIndex] = React.useState(0)
  const [isPlacing, setIsPlacing] = React.useState(false)

  // Lightweight "does this URL work" preview, keyed by sensor-form index.
  const [preview, setPreview] = React.useState<Record<number, { ok: boolean; text: string }>>({})

  const checkDataUrl = React.useCallback(async (index: number, url: string, dataFormat: string) => {
    if (!url.trim()) {
      setPreview(prev => { const next = { ...prev }; delete next[index]; return next })
      return
    }
    try {
      const res = await fetch(url)
      if (!res.ok) {
        setPreview(prev => ({ ...prev, [index]: { ok: false, text: t('previewError') } }))
        return
      }
      const raw = await res.text()
      const { points, unit } = parseSensorSeries(raw, dataFormat as SensorDataFormat)
      if (points.length === 0) {
        setPreview(prev => ({ ...prev, [index]: { ok: false, text: t('previewNoData') } }))
        return
      }
      const unitText = unit ? ` · ${unit}` : ''
      setPreview(prev => ({ ...prev, [index]: { ok: true, text: `${points.length} ${t('previewPoints')}${unitText}` } }))
    } catch {
      setPreview(prev => ({ ...prev, [index]: { ok: false, text: t('previewError') } }))
    }
  }, [t])

  // Re-initialize form with pre-selected type (or the sensor being edited) each time the dialog opens
  React.useEffect(() => {
    if (!isOpen) return
    setSensors([
      editSensor
        ? sensorFormFromEditSensor(editSensor)
        : {
          typeId: currentSensorTypeId ?? -1,
          name: '',
          data: '',
          dataFormat: SensorDataFormat.Json,
          updateFrequency: 1,
          updateFrequencyUnit: 1000,
          tags: [],
        },
    ])
    setCurrentSensorIndex(0)
    setPreview({})
  }, [isOpen, editSensor])

  const { createSensor } = useCreateSensor()
  // Hook order must stay stable regardless of whether editSensor is provided.
  const { updateSensor: updateSensorMutation } = useSensor(editSensor?.id ?? null)

  const setCursor = React.useCallback(
    (cursor: string) => {
      if (viewer === ViewerNames.map) {
        const map = mapContext?.state?.map?.map
        if (!map) return
        if (map.getCanvas().style.cursor === cursor) return
        map.getCanvas().style.cursor = cursor
        return
      }

      if (viewer === ViewerNames.bim) {
        bim?.setCursor?.(cursor)
      }
    },
    [bim, mapContext, viewer]
  )

  const reset = React.useCallback(() => {
    setIsPlacing(false)
    setSensors([
      {
        typeId: currentSensorTypeId ?? -1,
        name: '',
        data: '',
        dataFormat: SensorDataFormat.Json,
        updateFrequency: 1,
        updateFrequencyUnit: 1000,
        tags: [],
      },
    ])
    setCurrentSensorIndex(0)
    setPreview({})
    setCursor('')
    menusDispatch({type: 'SET_CURRENT_SENSOR_TYPE_ID', payload: { currentSensorTypeId: null }})
  }, [setCursor, currentSensorTypeId])

  const onCreateSensor = async (sensorData: Partial<Sensor>) => {
    await createSensor({ sensorData })

    // Ensure the sensor type is visible after creation
    if (sensorData.typeId) {
      menusDispatch({
        type: 'TOGGLE_SENSOR_TYPE_VISIBILITY',
        payload: {
          viewer: viewer,
          sensorTypeId: sensorData.typeId,
          force: true,
        },
      })
    }

    reset()
    onCancel?.()
  }

  const onSaveEdit = async () => {
    if (!editSensor) return
    const form = sensors[0]
    const partial: Partial<Sensor> = {
      typeId: form.typeId,
      name: form.name,
      data: form.data,
      dataFormat: form.dataFormat as SensorDataFormat,
      url: form.data,
      updateFrequency: form.updateFrequency * form.updateFrequencyUnit,
      tags: form.tags,
    }
    await updateSensorMutation(partial)
    onSaved?.()
    onCancel?.()
  }

  React.useEffect(() => {
    if (editSensor) return
    if (!isPlacing) return

    if (viewer === ViewerNames.map) {
      const map = mapContext?.state?.map?.map
      if (!map) return

      const mouseMoveCrosshairHandler = () => {
        setCursor('crosshair')
      }

      const dbClickAddSensorHandler = (e: any): void => {
        const longitude = e?.lngLat?.lng
        const latitude = e?.lngLat?.lat
        if (typeof longitude !== 'number' || typeof latitude !== 'number') return

        const elevation = map.queryTerrainElevation([latitude, longitude]) || 0

        const currentSensor = sensors[currentSensorIndex]
        const updateFrequencyMs = currentSensor.updateFrequency * currentSensor.updateFrequencyUnit

        const newSensor: any = {
          authorId: Number(user?.id),
          organizationId,
          typeId: currentSensor.typeId,
          name: currentSensor.name,
          data: currentSensor.data,
          dataFormat: currentSensor.dataFormat,
          updateFrequency: updateFrequencyMs,
          url: currentSensor.data,
          visible: true,
          longitude,
          latitude,
          elevation,
          viewer: ViewerNames.map,
          tags: currentSensor.tags,
        }
        onCreateSensor(newSensor as Partial<Sensor>)
      }

      map.on('mousemove', mouseMoveCrosshairHandler)
      map.on('dblclick', dbClickAddSensorHandler)

      return () => {
        setCursor('')
        map.off('mousemove', mouseMoveCrosshairHandler)
        map.off('dblclick', dbClickAddSensorHandler)
      }
    }

    if (viewer === ViewerNames.bim) {
      const world = bim?.world
      const raycast = bim?.raycast
      if (!world || !raycast) return

      let disposed = false
      let removeListeners: (() => void) | null = null

      ;(async () => {
        const THREE = await import('three')
        if (disposed) return

        const mouse = new THREE.Vector2()

        const handleMouseMove = (e: MouseEvent) => {
          mouse.x = e.clientX
          mouse.y = e.clientY
        }

        const handleDblClick = async (e: MouseEvent) => {
          mouse.x = e.clientX
          mouse.y = e.clientY

          const result = await raycast({
            camera: world.camera?.three,
            mouse,
            dom: world.renderer?.three?.domElement,
          })

          if (!result?.point) return
          const p = result.point

          const currentSensor = sensors[currentSensorIndex]
          const updateFrequencyMs = currentSensor.updateFrequency * currentSensor.updateFrequencyUnit

          // Add pending marker immediately
          const pendingId = bim?.addPendingMarker?.({ x: p.x, y: p.y, z: p.z })

          const newSensor: any = {
            authorId: Number(authorId),
            organizationId,
            typeId: currentSensor.typeId,
            name: currentSensor.name,
            data: currentSensor.data,
            dataFormat: currentSensor.dataFormat,
            updateFrequency: updateFrequencyMs,
            url: currentSensor.data,
            x: p.x,
            y: p.y,
            z: p.z,
            visible: true,
            buildingId,
            viewer,
            tags: currentSensor.tags,
          }

          try {
            await onCreateSensor(newSensor as Partial<Sensor>)
          } finally {
            // Remove pending marker after creation completes (or fails)
            if (pendingId) {
              bim?.removePendingMarker?.(pendingId)
            }
          }
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('dblclick', handleDblClick)

        removeListeners = () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('dblclick', handleDblClick)
        }
      })()

      return () => {
        disposed = true
        setCursor('')
        removeListeners?.()
      }
    }
  }, [
    appConfigState,
    bim,
    editSensor,
    isPlacing,
    mapContext,
    viewer,
    onCancel,
    reset,
    setCursor,
    sensors,
    currentSensorIndex,
    authorId,
    organizationId,
    buildingId,
    user?.id,
  ])

  const updateSensor = (index: number, field: keyof SensorFormData, value: any) => {
    setSensors(prev =>
      prev.map((sensor, i) => (i === index ? { ...sensor, [field]: value } : sensor))
    )
  }

  const addAnotherSensor = () => {
    setSensors(prev => [
      ...prev,
      {
        typeId: -1,
        name: '',
        data: '',
        dataFormat: SensorDataFormat.Json,
        updateFrequency: 1,
        updateFrequencyUnit: 1000,
        tags: [],
      },
    ])
  }

  const addTag = (index: number, tag: string) => {
    setSensors(prev =>
      prev.map((sensor, i) =>
        i === index ? { ...sensor, tags: [...sensor.tags, tag] } : sensor
      )
    )
  }

  const removeTag = (index: number, tag: string) => {
    setSensors(prev =>
      prev.map((sensor, i) =>
        i === index ? { ...sensor, tags: sensor.tags.filter(t => t !== tag) } : sensor
      )
    )
  }

  const onPlaceSensor = (index: number) => {
    const sensor = sensors[index]
    if (!sensor.name.trim() || !sensor.data.trim()) {
      return
    }
    setCurrentSensorIndex(index)
    setIsPlacing(true)
    setCursor('crosshair')
  }

  const { sensorTypes } = useSensorTypes()

  const placeSensorTooltip = viewer === ViewerNames.map
    ? t('placeSensorTooltipMap')
    : t('placeSensorTooltipBim')

  const sensorForm = (
    <div className="space-y-6">
      {sensors.map((sensor, index) => (
        <div key={index} className="space-y-4">
          {index > 0 && <Separator />}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`type-${index}`}>{t('type')}</Label>
              <Select
                value={sensor.typeId === -1 ? undefined : String(sensor.typeId)}
                onValueChange={value => updateSensor(index, 'typeId', Number(value))}
              >
                <SelectTrigger id={`type-${index}`}>
                  <SelectValue placeholder={t('selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {sensorTypes.map(type => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`name-${index}`}>{t('name')}</Label>
              <Input
                id={`name-${index}`}
                type="text"
                value={sensor.name}
                onChange={e => updateSensor(index, 'name', e.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`data-${index}`}>{t('dataUrl')}</Label>
            <Input
              id={`data-${index}`}
              type="text"
              value={sensor.data}
              onChange={e => updateSensor(index, 'data', e.target.value)}
              onBlur={e => checkDataUrl(index, e.target.value, sensor.dataFormat)}
              placeholder={t('dataUrlPlaceholder')}
            />
            {preview[index] && (
              <p className={cn('text-xs', preview[index].ok ? 'text-muted-foreground' : 'text-destructive')}>
                {preview[index].text}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`dataFormat-${index}`}>{t('dataFormat')}</Label>
              <Select
                value={sensor.dataFormat}
                onValueChange={value => updateSensor(index, 'dataFormat', value)}
              >
                <SelectTrigger id={`dataFormat-${index}`}>
                  <SelectValue placeholder={t('selectFormat')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(SensorDataFormat).map(format => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`frequency-${index}`}>{t('updateFrequency')}</Label>
              <div className="flex gap-2">
                <Input
                  id={`frequency-${index}`}
                  type="number"
                  min="1"
                  value={sensor.updateFrequency}
                  onChange={e =>
                    updateSensor(index, 'updateFrequency', parseFloat(e.target.value) || 1)
                  }
                  placeholder={t('frequencyPlaceholder')}
                  className="flex-1"
                />
                <Select
                  value={String(sensor.updateFrequencyUnit)}
                  onValueChange={value => updateSensor(index, 'updateFrequencyUnit', Number(value))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyUnits.map(unit => (
                      <SelectItem key={unit.value} value={String(unit.value)}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('tags')}</Label>
            <SensorTagsSection
              tags={sensor.tags}
              variant="edit"
              onAdd={async (tag) => addTag(index, tag)}
              onDelete={async (tag) => removeTag(index, tag)}
            />
          </div>

          {editSensor ? (
            <Button
              type="button"
              onClick={onSaveEdit}
              disabled={!sensor.name.trim() || !sensor.data.trim()}
              className="w-full"
            >
              {tf('save', 'Save')}
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => onPlaceSensor(index)}
                    disabled={!sensor.name.trim() || !sensor.data.trim()}
                    className="w-full"
                  >
                    {t('placeSensor')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{placeSensorTooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ))}
    </div>
  )

  if (layout === 'dialog') {
    // Render nothing visible when placing, but component stays mounted for useEffect
    if (isPlacing) {
      return <div style={{ display: 'none' }} />
    }

    return (
      <AddItemDialog
        open={isOpen}
        onOpenChange={open => !open && onCancel?.()}
        title={t('title')}
        icon={Radio}
        contentClassName="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {sensorForm}
      </AddItemDialog>
    )
  }

  return (
    <div className={cn('flex flex-col gap-4 p-4')}>
      <h3 className="text-lg font-semibold">{t('title')}</h3>
      {sensorForm}
    </div>
  )
}
