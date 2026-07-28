// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { colourForValue, observedDomain, resolveDomain, resolveRamp } from './sensorColour'
import { latestValues } from './useSensorSeriesMulti'

import type { ColourDomain } from './sensorColour'
import type { SensorSeries } from './sensorData'
import type { Sensor, SensorType } from '../../../types/dbTypes'

/** One building's sensors of a single type, reduced to a colourable number. */
export interface BuildingSensorAverage {
  buildingId: number
  /** Mean of the contributing sensors' latest readings. */
  average: number
  /** How many sensors reported a finite reading. Never zero: those buildings are omitted. */
  sensorCount: number
  colour: string
}

/** Enough of a sensor to aggregate it onto a building. */
export type AggregateSensor = Pick<Sensor, 'id' | 'typeId' | 'buildingId'>

/**
 * The type's colour domain, resolved the way the legend and the charts resolve it: the
 * configured `minValue..maxValue`, else the range observed across the polled sensors.
 *
 * `null` means the type has no usable domain, which callers must read as "no colours
 * configured" and answer by keeping their pre-colour appearance.
 */
export function typeDomain(
  sensorType: SensorType | null | undefined,
  seriesById: ReadonlyMap<number, SensorSeries>,
): ColourDomain | null {
  if (!sensorType) return null
  const points = [...seriesById.values()].flatMap(series => series.points)
  return resolveDomain(sensorType, observedDomain(points))
}

/**
 * Mean latest reading and ramp colour per building, for one sensor type.
 *
 * Deliberately blind to `sensor.viewer`: a building's temperature is its temperature whether the
 * sensor was placed on the map or inside the BIM model, so both feed the average. Every other
 * consumer of sensors filters by viewer, so do not "fix" this to match them.
 */
export function buildingSensorAverages(
  sensors: readonly AggregateSensor[],
  sensorType: SensorType | null | undefined,
  seriesById: ReadonlyMap<number, SensorSeries>,
): Map<number, BuildingSensorAverage> {
  const averages = new Map<number, BuildingSensorAverage>()
  if (!sensorType) return averages

  const domain = typeDomain(sensorType, seriesById)
  if (!domain) return averages

  const latest = latestValues(seriesById)
  const totals = new Map<number, { sum: number; count: number }>()

  for (const sensor of sensors) {
    if (sensor.buildingId == null) continue
    if (sensor.typeId !== sensorType.id) continue
    const value = latest.get(sensor.id)
    if (value === undefined) continue
    const total = totals.get(sensor.buildingId)
    if (total) {
      total.sum += value
      total.count += 1
    } else {
      totals.set(sensor.buildingId, { sum: value, count: 1 })
    }
  }

  const ramp = resolveRamp(sensorType)
  for (const [buildingId, { sum, count }] of totals) {
    const average = sum / count
    if (!Number.isFinite(average)) continue
    averages.set(buildingId, {
      buildingId,
      average,
      sensorCount: count,
      colour: colourForValue(average, ramp, domain),
    })
  }

  return averages
}

/**
 * Most recent reading time per building, epoch ms.
 *
 * Separate from the averages because a building can have a stale reading and still average
 * cleanly; showing when the number is from is what makes a dead feed visible.
 */
export function buildingLatestTimes(
  sensors: readonly AggregateSensor[],
  seriesById: ReadonlyMap<number, SensorSeries>,
): Map<number, number> {
  const times = new Map<number, number>()
  for (const sensor of sensors) {
    if (sensor.buildingId == null) continue
    const points = seriesById.get(sensor.id)?.points
    const last = points?.[points.length - 1]
    if (!last || !Number.isFinite(last.t)) continue
    const current = times.get(sensor.buildingId)
    if (current === undefined || last.t > current) times.set(sensor.buildingId, last.t)
  }
  return times
}

/**
 * The type the map should colour buildings by: pinned in the legend *and* switched on for the
 * viewer. The single gate for whether this feature polls and paints at all, so toggling the type
 * off both stops the requests and returns the footprints to their default colour.
 */
export function activeLegendTypeId(
  legendTypeId: number | null | undefined,
  visibleTypeIds: readonly number[] | undefined,
): number | null {
  if (legendTypeId == null) return null
  return visibleTypeIds?.includes(legendTypeId) ? legendTypeId : null
}

/**
 * Stable key over the resolved colours, for effect deps that must not fire on equal polls.
 * Sorted, so a reordered sensor list does not read as a change.
 */
export function buildingColoursKey(averages: ReadonlyMap<number, BuildingSensorAverage>): string {
  return [...averages.values()]
    .map(a => `${a.buildingId}:${a.colour}`)
    .sort()
    .join('|')
}
