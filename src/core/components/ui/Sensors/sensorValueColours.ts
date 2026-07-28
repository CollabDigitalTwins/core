// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { colourForValue, observedDomain, resolveDomain, resolveRamp } from './sensorColour'
import { latestValues } from './useSensorSeriesMulti'

import type { SensorSeries } from './sensorData'
import type { Sensor, SensorType } from '../../../types/dbTypes'

/** A sensor's latest reading plus the ramp colour that encodes it. */
export interface SensorReading {
  value: number
  colour: string
}

/**
 * Latest reading and ramp colour per sensor, grouped by sensor type.
 *
 * Each type is resolved independently: its own ramp, and its own domain (the configured
 * `minValue..maxValue`, falling back to the range observed across *that type's* sensors so they
 * stay comparable with each other). A type with no usable domain contributes nothing, which is
 * how callers know to keep their pre-colour appearance.
 *
 * Sensors with no type, no series, or no finite reading are simply absent from the result.
 */
export function valueColoursBySensor(
  sensors: Pick<Sensor, 'id' | 'typeId'>[],
  sensorTypes: SensorType[],
  seriesById: Map<number, SensorSeries>,
): Map<number, SensorReading> {
  const readings = new Map<number, SensorReading>()
  const latest = latestValues(seriesById)

  const idsByType = new Map<number, number[]>()
  for (const sensor of sensors) {
    if (sensor.typeId == null) continue
    const ids = idsByType.get(sensor.typeId)
    if (ids) ids.push(sensor.id)
    else idsByType.set(sensor.typeId, [sensor.id])
  }

  for (const [typeId, ids] of idsByType) {
    const sensorType = sensorTypes.find(t => t.id === typeId)
    if (!sensorType) continue

    const typePoints = ids.flatMap(id => seriesById.get(id)?.points ?? [])
    const domain = resolveDomain(sensorType, observedDomain(typePoints))
    if (!domain) continue

    const ramp = resolveRamp(sensorType)
    for (const id of ids) {
      const value = latest.get(id)
      if (value === undefined) continue
      readings.set(id, { value, colour: colourForValue(value, ramp, domain) })
    }
  }

  return readings
}

/** Stable key over the resolved colours, for effect deps that must not fire on equal polls. */
export function readingsKey(readings: Map<number, SensorReading>): string {
  return [...readings].map(([id, r]) => `${id}:${r.colour}`).join('|')
}
