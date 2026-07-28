'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useSensors } from '../../../hooks/sensors/sensors'
import { useSensorTypes } from '../../../hooks/sensorTypes/sensorTypes'
import { MenusContext } from '../../../store'
import { Button } from '../Button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '../DropdownMenu'
import { LegendCard } from '../LegendCard'

import { observedDomain, rampStops, resolveDomain, resolveRamp, valueOffset } from './sensorColour'
import { activeSensorTypeId, legendScopeSensors } from './sensorVisibility'
import { latestValues, useSensorSeriesMulti } from './useSensorSeriesMulti'

import type { ViewerNames } from '../../../types/dbTypes'

const format = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

/** `Air_Quality` reads as `Air Quality`, matching how the cards title a type. */
const typeLabel = (name: string): string => name.replace(/_/g, ' ')

/**
 * Colour legend for the viewer's active sensor type, shown in the bottom-left card stack.
 *
 * This is what makes the value ramp readable: it puts the domain's numbers next to the colours
 * used by the marker halos and the chart fill, so nothing in the scene is encoded by colour
 * alone. Its title doubles as the type picker, which also retargets the halos and the map's
 * building colours.
 *
 * It exists only while it has something to explain: dismissed by its own close button, or with
 * no visible sensor of the active type, it renders nothing.
 */
export function SensorLegend(): React.ReactElement | null {
  const t = useTranslations('SensorLegend')
  const { state, dispatch } = React.useContext(MenusContext)
  const {
    focusedSensorId,
    currentSensorId,
    currentViewer,
    visibleSensorTypes,
    visibleSensorTags,
    sensorLegendVisible,
    sensorLegendTypeId,
  } = state.menus
  const viewer = currentViewer as ViewerNames

  const { sensors } = useSensors()
  const { sensorTypes } = useSensorTypes()

  // A click-focused sensor wins; hover is the fallback so the legend still explains the colours
  // while the pointer sweeps the scene.
  const activeId = focusedSensorId ?? currentSensorId
  const activeSensor = activeId == null ? undefined : sensors.find(s => s.id === activeId)
  const activeTypeId = activeSensorTypeId(sensors, {
    legendTypeId: sensorLegendTypeId?.[viewer],
    activeSensorId: activeId,
  })
  const sensorType = sensorTypes.find(ty => ty.id === activeTypeId)

  // After the type is changed from the dropdown the focused sensor belongs to another type, so
  // there is no reading to mark: the card shows the ramp alone until a sensor is picked.
  const caretSensor = activeSensor?.typeId === activeTypeId ? activeSensor : undefined

  const inScope = legendScopeSensors(
    sensors,
    {
      viewer,
      visibleTypeIds: visibleSensorTypes?.[viewer] ?? [],
      visibleTags: visibleSensorTags?.[viewer] ?? [],
    },
    activeTypeId,
  )

  // Polls the whole type, not just the focused sensor. Two reasons: the ramp has to be drawable
  // with nothing focused, and a type whose configured range is unusable can only get a domain
  // from what its sensors are actually reporting. It also makes the legend's domain identical to
  // the one the marker halos use, which is resolved across the same set.
  const { seriesById } = useSensorSeriesMulti(inScope, { enabled: inScope.length > 0 })

  // Types worth offering: every type placed in this viewer, visible or not. Picking a hidden
  // one turns it on below, so the list does not have to be pre-filtered by visibility.
  const selectableTypes = sensorTypes.filter(
    ty => sensors.some(s => s.viewer === viewer && s.typeId === ty.id),
  )

  const selectType = React.useCallback((sensorTypeId: number) => {
    dispatch({ type: 'SET_SENSOR_LEGEND_TYPE_ID', payload: { viewer, sensorTypeId } })
    // Without this the legend would hide itself the moment it retargets to a hidden type.
    dispatch({ type: 'TOGGLE_SENSOR_TYPE_VISIBILITY', payload: { viewer, sensorTypeId, force: true } })
    // Drops the caret, since the focused sensor is no longer of the displayed type. A null
    // payload deliberately leaves the pin above intact.
    dispatch({ type: 'SET_FOCUSED_SENSOR_ID', payload: { sensorId: null } })
  }, [dispatch, viewer])

  const closeLegend = React.useCallback(() => {
    dispatch({ type: 'TOGGLE_SENSOR_LEGEND', payload: { viewer, visible: false } })
  }, [dispatch, viewer])

  if (sensorLegendVisible?.[viewer] === false) return null
  if (!sensorType) return null
  // The one rule tying the card to the scene: no visible sensors of this type, no legend. Covers
  // the type switch, the tag switch and hide-all in a single condition.
  if (inScope.length === 0) return null

  const ramp = resolveRamp(sensorType)
  const typePoints = [...seriesById.values()].flatMap(series => series.points)
  const domain = resolveDomain(sensorType, observedDomain(typePoints))

  const caretSeries = caretSensor ? seriesById.get(caretSensor.id) : undefined
  const unit = caretSeries?.unit ?? [...seriesById.values()].find(s => s.unit)?.unit
  const valueLabels = caretSeries?.valueLabels
  const latest = caretSensor ? latestValues(seriesById).get(caretSensor.id) : undefined
  const hasReading = latest !== undefined
  const gradient = `linear-gradient(to right, ${rampStops(ramp)
    .map(s => `${s.colour} ${s.offset * 100}%`)
    .join(', ')})`

  const readingText = hasReading
    ? valueLabels?.[latest] ?? `${format.format(latest)}${unit ? ` ${unit}` : ''}`
    : t('noReading')

  const title = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title={t('selectType')}
          className="-ml-2 h-7 gap-1 px-2 text-sm font-medium"
          data-testid="sensor-legend-type-trigger"
        >
          {typeLabel(String(sensorType.name))}
          <LR.ChevronDown size={14} className="opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={String(sensorType.id)}
          onValueChange={value => selectType(Number(value))}
        >
          {selectableTypes.map(ty => (
            <DropdownMenuRadioItem key={ty.id} value={String(ty.id)}>
              {typeLabel(String(ty.name))}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <LegendCard
      title={title}
      titleLabel={typeLabel(String(sensorType.name))}
      count={inScope.length}
      onClose={closeLegend}
      closeLabel={t('close')}
      testId="sensor-legend-card"
      countTestId="sensor-legend-count"
    >
      <div className="px-3 py-2">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{caretSensor?.name ?? ''}</span>
          {caretSensor && (
            <span className="shrink-0 text-xs font-medium tabular-nums">{readingText}</span>
          )}
        </div>

        {/* An unconfigured type still gets a card, so the picker that reached it stays reachable. */}
        {domain == null ? (
          <p className="text-xs text-muted-foreground">{t('noRange')}</p>
        ) : (
          <div className="relative">
            {/* Caret sits above the ramp at the current value. */}
            <div className="relative h-2">
              {hasReading && (
                <div
                  data-testid="sensor-legend-caret"
                  className="absolute top-0 -translate-x-1/2"
                  style={{ left: `${valueOffset(latest, domain) * 100}%` }}
                >
                  <div className="h-2 w-0.5 rounded-full bg-foreground" />
                </div>
              )}
            </div>
            <div
              data-testid="sensor-legend-ramp"
              aria-hidden="true"
              className="h-2.5 w-full rounded-full"
              style={{ background: gradient }}
            />
            <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
              <span>{format.format(domain.min)}</span>
              <span>{format.format((domain.min + domain.max) / 2)}</span>
              <span>{format.format(domain.max)}</span>
            </div>
          </div>
        )}
      </div>
    </LegendCard>
  )
}
