'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useSensors } from '../../../hooks/sensors/sensors'
import { useSensorTypes } from '../../../hooks/sensorTypes/sensorTypes'
import { MenusContext } from '../../../store'

import {
  activeLegendTypeId,
  buildingColoursKey,
  buildingLatestTimes,
  buildingSensorAverages,
  typeDomain,
  type BuildingSensorAverage,
} from './buildingSensorColours'
import { valueColoursBySensor, type SensorReading } from './sensorValueColours'
import { activeSensorTypeId } from './sensorVisibility'
import { useSensorSeriesMulti } from './useSensorSeriesMulti'

import type { ColourDomain } from './sensorColour'
import type { Sensor, SensorType, ViewerNames } from '../../../types/dbTypes'

export interface UseBuildingSensorColoursResult {
  /** `null` when nothing should be coloured. Also the poll gate. */
  typeId: number | null
  sensorType?: SensorType
  /** Identity is stable while `colourKey` is, so it is safe in an effect dep list. */
  averages: ReadonlyMap<number, BuildingSensorAverage>
  colourKey: string
  domain: ColourDomain | null
  /** The active type's sensors, grouped by the building they are attached to. */
  sensorsByBuilding: ReadonlyMap<number, Sensor[]>
  /** Latest reading and ramp colour per sensor, for listing them individually. */
  readings: ReadonlyMap<number, SensorReading>
  /** Most recent reading time per building, epoch ms, so a stale feed is visible. */
  latestAtByBuilding: ReadonlyMap<number, number>
  /** Unit symbol reported by the feeds, when they agree on one. */
  unit?: string
}

const EMPTY_AVERAGES: ReadonlyMap<number, BuildingSensorAverage> = new Map()
const EMPTY_BY_BUILDING: ReadonlyMap<number, Sensor[]> = new Map()
const EMPTY_READINGS: ReadonlyMap<number, SensorReading> = new Map()
const EMPTY_TIMES: ReadonlyMap<number, number> = new Map()

/**
 * Per-building aggregate of the sensor type the viewer is currently explaining.
 *
 * Polls only while a type is pinned in the legend *and* switched on for the viewer, so the map
 * fans out no requests until the user asks to see a type. Both the footprint colours and the
 * per-building sensor counts are derived from this one poll.
 */
export function useBuildingSensorColours(viewer: ViewerNames): UseBuildingSensorColoursResult {
  const { state } = React.useContext(MenusContext)
  const { visibleSensorTypes, sensorLegendTypeId, focusedSensorId } = state.menus

  const { sensors } = useSensors()
  const { sensorTypes } = useSensorTypes()

  // Same type the legend titles itself with and the halos colour by, then gated on that type
  // still being switched on. Hover is deliberately not a fallback here: repainting every
  // footprint as the pointer sweeps the map would be unusable.
  const typeId = activeLegendTypeId(
    activeSensorTypeId(sensors, {
      legendTypeId: sensorLegendTypeId?.[viewer],
      activeSensorId: focusedSensorId,
    }),
    visibleSensorTypes?.[viewer],
  )
  const sensorType = typeId == null ? undefined : sensorTypes.find(t => t.id === typeId)

  // Every sensor of the type that is attached to a building, in either viewer: a building's
  // temperature is its temperature wherever the sensor was placed.
  const targets = typeId == null
    ? []
    : sensors.filter(s => s.typeId === typeId && s.buildingId != null)
  const targetsKey = targets.map(s => s.id).join(',')

  const { seriesById } = useSensorSeriesMulti(targets, { enabled: targets.length > 0 })

  const domain = typeDomain(sensorType, seriesById)

  // `targets` is a fresh array on every render, so the deps key on `targetsKey` instead.
  const rawAverages = React.useMemo(
    () => buildingSensorAverages(targets, sensorType, seriesById),
    [seriesById, sensorType, targetsKey],
  )

  // The poll rebuilds `seriesById` every 15s, so its identity says nothing about whether the
  // colours moved. Freezing on the colour key is what stops the map repainting on every tick.
  // Deps are deliberately narrower than the value returned: equal colours must keep the
  // previous map identity, which is the whole point of this memo.
  const colourKey = buildingColoursKey(rawAverages)
  const averages = React.useMemo(() => rawAverages, [colourKey])

  const sensorsByBuilding = React.useMemo(() => {
    const grouped = new Map<number, Sensor[]>()
    for (const sensor of targets) {
      if (sensor.buildingId == null) continue
      const list = grouped.get(sensor.buildingId)
      if (list) list.push(sensor)
      else grouped.set(sensor.buildingId, [sensor])
    }
    for (const list of grouped.values()) list.sort((a, b) => a.name.localeCompare(b.name))
    return grouped
  }, [targetsKey])

  const readings = React.useMemo(
    () => valueColoursBySensor(targets, sensorTypes, seriesById),
    [seriesById, sensorTypes, targetsKey],
  )

  const latestAtByBuilding = React.useMemo(
    () => buildingLatestTimes(targets, seriesById),
    [seriesById, targetsKey],
  )

  // Feeds of one type normally agree; take the first that reports one rather than inventing a
  // rule for the mismatch case.
  const unit = [...seriesById.values()].find(series => series.unit)?.unit

  if (typeId == null) {
    return {
      typeId: null,
      sensorType: undefined,
      averages: EMPTY_AVERAGES,
      colourKey: '',
      domain: null,
      sensorsByBuilding: EMPTY_BY_BUILDING,
      readings: EMPTY_READINGS,
      latestAtByBuilding: EMPTY_TIMES,
      unit: undefined,
    }
  }

  return {
    typeId,
    sensorType,
    averages,
    colourKey,
    domain,
    sensorsByBuilding,
    readings,
    latestAtByBuilding,
    unit,
  }
}
