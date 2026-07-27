// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { ViewerNames } from '../../../types/dbTypes'

import { UNTAGGED_TAG } from './sensorVisibility'
import { activeSensorTypeId, isSensorVisible, visibleSensors } from './sensorVisibility'

const s = (id: number, typeId: number | null, tags: string[], viewer = ViewerNames.map) =>
  ({ id, typeId, tags, viewer })

const scope = (visibleTypeIds: number[], visibleTags: string[], viewer = ViewerNames.map) =>
  ({ viewer, visibleTypeIds, visibleTags })

describe('isSensorVisible', () => {
  it('hides a sensor belonging to another viewer', () => {
    expect(isSensorVisible(s(1, 10, ['north'], ViewerNames.bim), scope([10], []))).toBe(false)
  })

  it('shows a sensor whose type is selected', () => {
    expect(isSensorVisible(s(1, 10, ['north']), scope([10], []))).toBe(true)
  })

  it('shows a sensor whose tag is selected even when its type is not', () => {
    expect(isSensorVisible(s(1, 10, ['north']), scope([], ['north']))).toBe(true)
  })

  it('selects an untagged sensor through the sentinel', () => {
    expect(isSensorVisible(s(1, 10, []), scope([], [UNTAGGED_TAG]))).toBe(true)
  })

  it('does not let the sentinel select a tagged sensor', () => {
    expect(isSensorVisible(s(1, 10, ['north']), scope([], [UNTAGGED_TAG]))).toBe(false)
  })

  it('hides a sensor selected by neither channel', () => {
    expect(isSensorVisible(s(1, 10, ['north']), scope([20], ['roof']))).toBe(false)
  })

  it('hides a typeless sensor when only types are selected', () => {
    expect(isSensorVisible(s(1, null, ['north']), scope([10], []))).toBe(false)
  })
})

describe('visibleSensors', () => {
  it('keeps only the visible sensors, in order', () => {
    const all = [
      s(1, 10, ['north']),
      s(2, 20, ['roof']),
      s(3, 10, [], ViewerNames.bim),
      s(4, 10, []),
    ]
    expect(visibleSensors(all, scope([10], [])).map(x => x.id)).toEqual([1, 4])
  })

  it('returns nothing when neither types nor tags are selected', () => {
    expect(visibleSensors([s(1, 10, ['north'])], scope([], []))).toEqual([])
  })
})

describe('activeSensorTypeId', () => {
  const all = [s(1, 10, []), s(2, 20, []), s(3, null, [])]

  it('prefers the type pinned in the legend', () => {
    expect(activeSensorTypeId(all, { legendTypeId: 20, activeSensorId: 1 })).toBe(20)
  })

  it('falls back to the active sensor when nothing is pinned', () => {
    expect(activeSensorTypeId(all, { legendTypeId: null, activeSensorId: 1 })).toBe(10)
  })

  it('returns null when no sensor is active and nothing is pinned', () => {
    expect(activeSensorTypeId(all, { activeSensorId: null })).toBeNull()
  })

  it('returns null when the active sensor has no type', () => {
    expect(activeSensorTypeId(all, { activeSensorId: 3 })).toBeNull()
  })

  it('returns null when the active sensor is not in the list', () => {
    expect(activeSensorTypeId(all, { activeSensorId: 99 })).toBeNull()
  })
})
