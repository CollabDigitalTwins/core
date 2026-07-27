// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Sensor, ViewerNames } from '../../../types/dbTypes'

/**
 * Stable key used in state for sensors with no tags. Locale-independent.
 *
 * Defined here rather than in `SensorsSection` so the pure modules and the map/BIM layers can
 * reach it without importing the sidebar component; `SensorsSection` re-exports it.
 */
export const UNTAGGED_TAG = '__untagged__'

/** The slice of `MenusState` that decides whether a sensor is drawn, for one viewer. */
export interface SensorVisibilityScope {
  viewer: ViewerNames
  visibleTypeIds: readonly number[]
  visibleTags: readonly string[]
}

/** Enough of a sensor to decide its visibility. Keeps callers free to pass enriched rows. */
export type VisibilityCandidate = Pick<Sensor, 'viewer' | 'typeId' | 'tags'>

/**
 * Whether a sensor is drawn in a viewer.
 *
 * Type and tag are alternatives, not filters that compose: the sidebar groups by one or the
 * other and clears the opposing state when you switch, so a sensor shows if either channel
 * selects it. A sensor carrying no tags is selected by `UNTAGGED_TAG`.
 */
export function isSensorVisible(sensor: VisibilityCandidate, scope: SensorVisibilityScope): boolean {
  if (sensor.viewer !== scope.viewer) return false
  const matchesType = sensor.typeId != null && scope.visibleTypeIds.includes(sensor.typeId)
  const matchesTag = sensor.tags?.length
    ? sensor.tags.some(tag => scope.visibleTags.includes(tag))
    : scope.visibleTags.includes(UNTAGGED_TAG)
  return matchesType || matchesTag
}

/** `isSensorVisible` over a list, preserving the caller's element type. */
export function visibleSensors<T extends VisibilityCandidate>(
  sensors: readonly T[],
  scope: SensorVisibilityScope,
): T[] {
  return sensors.filter(sensor => isSensorVisible(sensor, scope))
}

/**
 * The sensor type the viewer is currently explaining: what the legend titles itself with, what
 * the marker halos colour by, and what the map colours buildings by.
 *
 * A type pinned in the legend dropdown wins, so those three stay in agreement after the user
 * retargets the legend. Otherwise it follows the active sensor, which callers resolve
 * differently: the legend lets hover stand in for focus, the viewers use focus alone so halos
 * do not flicker as the pointer sweeps the scene.
 */
export function activeSensorTypeId(
  sensors: readonly Pick<Sensor, 'id' | 'typeId'>[],
  opts: { legendTypeId?: number | null; activeSensorId?: number | null },
): number | null {
  if (opts.legendTypeId != null) return opts.legendTypeId
  if (opts.activeSensorId == null) return null
  return sensors.find(sensor => sensor.id === opts.activeSensorId)?.typeId ?? null
}
