'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useSensor, useSensors } from '../../../hooks/sensors/sensors'
import { useSensorTypes } from '../../../hooks/sensorTypes/sensorTypes'
import { AppConfigContext, BuildingsContext, MenusContext, ToolsContext } from '../../../store'
import { resolveDefaultTimeZone } from '../../../utils/timeUtils'
import { stringToColour } from '../../viewers/map/utils/stringToColour'
import { Button } from '../Button'
import { CollapsibleSection } from '../CollapsibleSection'
import { DropdownMenu } from '../DropdownMenu'
import {
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '../DropdownMenu'
import { SearchInput } from '../SearchInput'

import { CollapsibleSensorItem } from './CollapsibleSensorItem'
import { SensorInput } from './SensorInput'
import { SensorsSectionSkeleton } from './SensorsSectionSkeleton'
import { resolveLucideIcon } from './sensorUtils'
import { valueColoursBySensor } from './sensorValueColours'
import { useSensorSeriesMulti } from './useSensorSeriesMulti'

import type { Sensor } from '../../../types/dbTypes';

/** Sidebar readings: compact, at most one decimal, so a row stays on one line. */
const readingNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })


type SensorAction = 'view' | 'edit' | 'delete'

/** Stable key used in state for sensors with no tags — locale-independent */
export const UNTAGGED_TAG = '__untagged__'

export function SensorsSection() {
  // Translation
  const t = useTranslations('SensorsSection')

  const { dispatch: toolsDispatch } = React.useContext(ToolsContext)
  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const { currentViewer, visibleSensorTypes, visibleSensorTags, focusedSensorId } = menusState.menus

  const { sensors: allSensors }: { sensors: Sensor[] } = useSensors()
  const { sensorTypes, isLoading } = useSensorTypes()

  const {state: buildingsState} = React.useContext(BuildingsContext)
  const buildingId = buildingsState?.buildings?.building?.id || -1

  const { state: appConfigState, dispatch: appConfigDispatch } = React.useContext(AppConfigContext)

  const [sensorToDelete, setSensorToDelete] = React.useState<number | null>(null)
  const [editSensorId, setEditSensorId] = React.useState<number | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [groupBy, setGroupBy] = React.useState<'type' | 'tag'>('type')
  const { deleteSensor } = useSensor(sensorToDelete)

  const handleAddSensor = React.useCallback((currentSensorTypeId?: number) => {
    if (!currentViewer) return
      toolsDispatch({
        type: 'SET-TOOL',
        payload: {
          currentToolId:
            currentViewer === 'bim'
              ? 'bim-add-sensor'
              : currentViewer === 'map'
                ? 'map-add-sensor'
                : undefined,
        },
      })
      if (currentSensorTypeId) {
        menusDispatch({
          type: 'SET_CURRENT_SENSOR_TYPE_ID',
          payload: { currentSensorTypeId },
        })
      }
  }, [toolsDispatch, currentViewer])

  const handleSensorAction = React.useCallback((action: SensorAction, id: number) => {
    switch (action) {
      case 'view':
        // ⚠️ View sensor action not implemented
        break
      case 'edit':
        setEditSensorId(id)
        break
      case 'delete':
            toast.success(t('sensorDeleted'))
            setSensorToDelete(id)
        break
      default:
        break
    }
  }, [t])

  // Trigger deletion when sensorToDelete changes
  React.useEffect(() => {
    if (sensorToDelete !== null) {
      void deleteSensor()
      setSensorToDelete(null)
    }
  }, [sensorToDelete, deleteSensor])

  const currentSensors: Sensor[] = allSensors.filter((sensor) => currentViewer === sensor.viewer && (!sensor.buildingId || sensor.buildingId === buildingId))

  // Readings for every listed sensor, so each row can be ringed by its current value. This is the
  // only place that polls across types; the viewers poll the focused type alone. Bounded by
  // useSensorSeriesMulti's concurrency cap and only active while this panel is mounted.
  const { seriesById } = useSensorSeriesMulti(currentSensors, { enabled: currentSensors.length > 0 })
  const readings = React.useMemo(
    () => valueColoursBySensor(currentSensors, sensorTypes, seriesById),
    [seriesById, sensorTypes, currentSensors.map(s => s.id).join(',')],
  )
  const readingText = (sensorId: number): string | undefined => {
    const reading = readings.get(sensorId)
    if (!reading) return undefined
    const unit = seriesById.get(sensorId)?.unit
    const labels = seriesById.get(sensorId)?.valueLabels
    return labels?.[reading.value] ?? `${readingNumber.format(reading.value)}${unit ? ` ${unit}` : ''}`
  }

  // Default the display zone from the building's (else a sensor's) longitude, until the user overrides.
  // Depends on primitive longitudes (not the re-created currentSensors array) so it only runs on real change.
  const buildingLongitude = buildingsState?.buildings?.building?.buildingLongitude ?? null
  const firstSensorLongitude = currentSensors.find(s => typeof s.longitude === 'number')?.longitude ?? null
  const { displayTimeZone, displayTimeZoneUserSet } = appConfigState.appConfig
  React.useEffect(() => {
    if (displayTimeZoneUserSet) return
    // BIM sensors live in a building (use its longitude); map sensors carry their own.
    const candidates = currentViewer === 'bim'
      ? [buildingLongitude, firstSensorLongitude]
      : [firstSensorLongitude, buildingLongitude]
    const zone = resolveDefaultTimeZone(candidates)
    if (zone !== displayTimeZone) {
      appConfigDispatch({ type: 'SET_DEFAULT_TIME_ZONE', payload: { displayTimeZone: zone } })
    }
  }, [currentViewer, buildingLongitude, firstSensorLongitude, displayTimeZone, displayTimeZoneUserSet, appConfigDispatch])

  // Filter sensors based on search query
  const filteredSensors = React.useMemo(() => {
    if (!searchQuery.trim()) return currentSensors

    const query = searchQuery.toLowerCase()
    return currentSensors.filter((sensor) => {
      const sensorTypeName =
      sensorTypes.find(type => type.id === sensor.typeId)?.name ?? ''
      return (
      sensor.name?.toLowerCase().includes(query) ||
      sensorTypeName.toLowerCase().includes(query)
      )
    })
  }, [currentSensors, searchQuery])

  const toggleSensorTypeVisibility = React.useCallback((sensorTypeId: number) => {
    menusDispatch({
      type: 'TOGGLE_SENSOR_TYPE_VISIBILITY',
      payload: {
        viewer: currentViewer,
        sensorTypeId: sensorTypeId,
      },
    })
  }, [currentViewer, menusDispatch])

  const handleGroupByChange = React.useCallback((newGroupBy: 'type' | 'tag') => {
    setGroupBy(newGroupBy)
    // Clear the opposing visibility state so markers from the old filter don't bleed through
    if (newGroupBy === 'tag') {
      menusDispatch({ type: 'HIDE_ALL_SENSORS_IN_VIEWER', payload: { viewer: currentViewer } })
    } else {
      menusDispatch({ type: 'HIDE_ALL_SENSOR_TAGS_IN_VIEWER', payload: { viewer: currentViewer } })
    }
  }, [currentViewer, menusDispatch])

  const toggleSensorTagVisibility = React.useCallback((tag: string) => {
    menusDispatch({
      type: 'TOGGLE_SENSOR_TAG_VISIBILITY',
      payload: {
        viewer: currentViewer,
        sensorTag: tag,
      },
    })
  }, [currentViewer, menusDispatch])

  // Group sensors by type, using sensorTypes as the source of truth for types
  const sensorsByType = React.useMemo(() => {
    const grouped: Record<string, Sensor[]> = {}
    sensorTypes.forEach(type => {
      grouped[type.name] = []
    })
    filteredSensors.forEach(sensor => {
      const type = sensorTypes.find(t => t.id === sensor.typeId)
      const typeName = type?.name ?? 'Other'
      if (!grouped[typeName]) {
        grouped[typeName] = []
      }
      grouped[typeName].push(sensor)
    })
    // Remove empty groups
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0) {
        delete grouped[key]
      }
    })
    return grouped
  }, [filteredSensors, sensorTypes])

  // Group sensors by tag
  const sensorsByTag = React.useMemo(() => {
    const grouped: Record<string, Sensor[]> = {}
    filteredSensors.forEach(sensor => {
      const tags = sensor.tags && sensor.tags.length > 0 ? sensor.tags : [UNTAGGED_TAG]
      tags.forEach(tag => {
        if (!grouped[tag]) grouped[tag] = []
        grouped[tag].push(sensor)
      })
    })
    return grouped
  }, [filteredSensors])

  return (
    <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
      <div className="px-4 flex items-center gap-2">
        <SearchInput
          placeholder={t('searchSensors')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" title={t('filters')} className="flex-shrink-0">
              <LR.Funnel size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('groupBy')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={groupBy} onValueChange={v => handleGroupByChange(v as 'type' | 'tag')}>
              <DropdownMenuRadioItem value="type">
                <LR.Layers className="mr-2 h-4 w-4" />
                {t('groupByType')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="tag">
                <LR.Tag className="mr-2 h-4 w-4" />
                {t('groupByTag')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isLoading ? (
        <SensorsSectionSkeleton />
      ) :
      filteredSensors.length === 0 ? (
        <div className="p-4 text-muted-foreground text-sm flex flex-col items-center">
          <div>{t('noSensorsFound')}</div>
          <Button
            className="mt-2 px-4 "
            variant='outline'
            onClick={() => handleAddSensor()}
          >
            {t('addSensorTitle')}
          </Button>
        </div>
      ) : groupBy === 'type' ? (
        Object.entries(sensorsByType).map(([typeName, sensorsOfType]) => {
          const type = sensorTypes.find(t => t.name === typeName)
          const typeId = type?.id ?? -1

          const viewerTypes = visibleSensorTypes?.[currentViewer]
          const isTypeVisible = viewerTypes?.length > 0 && viewerTypes.includes(typeId)

          const sensorIcon = resolveLucideIcon(type?.icon)

          return (
            <CollapsibleSection
              key={typeName}
              title={typeName.replace(/_/g, ' ')}
              icon={sensorIcon}
              className="overflow-y-auto"
              itemCount={sensorsOfType.length}
              onAddItem={() => handleAddSensor(typeId)}
              addItemTitle={t('addSensorTitle')}
              defaultOpen={false}
              switchVariant={{
                checked: isTypeVisible,
                onCheckedChange: () => toggleSensorTypeVisibility(typeId),
              }}
            >
              <div className="space-y-2 mx-2 pr-2">
                {sensorsOfType.map((sensor) => (
                  <CollapsibleSensorItem
                    key={sensor.id}
                    sensor={sensor}
                    sensorType={type}
                    onAction={handleSensorAction}
                    isVisible={isTypeVisible}
                    onMouseEnter={() => menusDispatch({ type: 'SET_CURRENT_SENSOR_ID', payload: { currentSensorId: sensor.id } })}
                    onMouseLeave={() => menusDispatch({ type: 'SET_CURRENT_SENSOR_ID', payload: { currentSensorId: null } })}
                    onSelect={() => menusDispatch({ type: 'SET_FOCUSED_SENSOR_ID', payload: { sensorId: sensor.id } })}
                    isFocused={focusedSensorId === sensor.id}
                    valueColour={readings.get(sensor.id)?.colour}
                    valueText={readingText(sensor.id)}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )
        })
      ) : (
        Object.entries(sensorsByTag).map(([tag, sensorsOfTag]) => {
          const isTagVisible = visibleSensorTags?.[currentViewer]?.includes(tag) ?? false
          return (
          <CollapsibleSection
            key={tag}
            title={tag === UNTAGGED_TAG ? t('untagged') : tag}
            icon={LR.Tag}
            colour={stringToColour(tag, 'max')}
            className="overflow-y-auto"
            itemCount={sensorsOfTag.length}
            defaultOpen={false}
            switchVariant={{
              checked: isTagVisible,
              onCheckedChange: () => toggleSensorTagVisibility(tag),
            }}
          >
            <div className="space-y-2 mx-2 pr-2">
              {sensorsOfTag.map((sensor) => {
                const type = sensorTypes.find(tp => tp.id === sensor.typeId)
                return (
                  <CollapsibleSensorItem
                    key={sensor.id}
                    sensor={sensor}
                    sensorType={type}
                    onAction={handleSensorAction}
                    isVisible={isTagVisible}
                    onMouseEnter={() => menusDispatch({ type: 'SET_CURRENT_SENSOR_ID', payload: { currentSensorId: sensor.id } })}
                    onMouseLeave={() => menusDispatch({ type: 'SET_CURRENT_SENSOR_ID', payload: { currentSensorId: null } })}
                    onSelect={() => menusDispatch({ type: 'SET_FOCUSED_SENSOR_ID', payload: { sensorId: sensor.id } })}
                    isFocused={focusedSensorId === sensor.id}
                    valueColour={readings.get(sensor.id)?.colour}
                    valueText={readingText(sensor.id)}
                  />
                )
              })}
            </div>
          </CollapsibleSection>
          )
        })
      )}

      {editSensorId != null && allSensors.some(s => s.id === editSensorId) && (
        <SensorInput
          viewer={currentViewer}
          layout="dialog"
          isOpen={editSensorId != null}
          editSensor={allSensors.find(s => s.id === editSensorId)}
          onCancel={() => setEditSensorId(null)}
          onSaved={() => setEditSensorId(null)}
        />
      )}
    </div>
  )
}
