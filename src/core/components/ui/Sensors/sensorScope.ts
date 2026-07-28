// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { UNTAGGED_TAG } from './sensorVisibility'

import type { Sensor } from '../../../types/dbTypes'

/** Which sensors the detail dialog's charts cover. */
export type ScopeMode = 'sensor' | 'type' | 'tag'

export interface SensorScope {
  mode: ScopeMode
  /** Only read when `mode` is `tag`. `UNTAGGED_TAG` selects sensors with no tags. */
  tag?: string | null
}

type ScopeSensor = Pick<Sensor, 'id' | 'typeId' | 'tags' | 'viewer'>

/** The tags a sensor counts under, treating "no tags" as the untagged sentinel. */
export function tagsOf(sensor: Pick<Sensor, 'tags'>): string[] {
  return sensor.tags && sensor.tags.length > 0 ? sensor.tags : [UNTAGGED_TAG]
}

/**
 * The sensors in scope for the charts, always including `focused` itself so the emphasised
 * series never disappears from its own dialog.
 *
 * - `sensor`: just the focused sensor.
 * - `type`: every sensor sharing its type, in the same viewer.
 * - `tag`: the `type` set narrowed to one tag.
 *
 * Ordering is stable (ascending id) so a line keeps its position between polls, and comparing
 * against `typeId` requires a real type: sensors with no type never group together.
 */
export function sensorsInScope<T extends ScopeSensor>(
  focused: T,
  all: T[],
  scope: SensorScope,
): T[] {
  if (scope.mode === 'sensor') return [focused]

  const sameType = all.filter(
    s => focused.typeId != null && s.typeId === focused.typeId && s.viewer === focused.viewer,
  )

  const scoped = scope.mode === 'tag' && scope.tag
    ? sameType.filter(s => s.id === focused.id || tagsOf(s).includes(scope.tag as string))
    : sameType

  // `focused` may be filtered out by its own viewer/type being unset; put it back.
  const withFocused = scoped.some(s => s.id === focused.id) ? scoped : [focused, ...scoped]
  return [...withFocused].sort((a, b) => a.id - b.id)
}

/** Tags available to filter by within the focused sensor's type, sorted for a stable menu. */
export function tagsForScope<T extends ScopeSensor>(focused: T, all: T[]): string[] {
  const sameType = all.filter(
    s => focused.typeId != null && s.typeId === focused.typeId && s.viewer === focused.viewer,
  )
  const tags = new Set<string>()
  for (const sensor of sameType) {
    for (const tag of tagsOf(sensor)) tags.add(tag)
  }
  // Untagged sorts last so real tags lead the menu.
  return [...tags].sort((a, b) => {
    if (a === UNTAGGED_TAG) return 1
    if (b === UNTAGGED_TAG) return -1
    return a.localeCompare(b)
  })
}
