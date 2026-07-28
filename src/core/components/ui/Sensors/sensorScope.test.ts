// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { ViewerNames } from '../../../types/dbTypes'

import { sensorsInScope, tagsForScope, tagsOf } from './sensorScope'
import { UNTAGGED_TAG } from './sensorVisibility'


const s = (id: number, typeId: number | null, tags: string[], viewer = ViewerNames.bim) =>
  ({ id, typeId, tags, viewer })

// Two temperature sensors (ids 1, 2), one untagged temperature (3), one humidity (4),
// and a temperature sensor in the other viewer (5).
const focused = s(1, 10, ['north'])
const all = [
  focused,
  s(2, 10, ['north', 'roof']),
  s(3, 10, []),
  s(4, 20, ['north']),
  s(5, 10, ['north'], ViewerNames.map),
]

describe('tagsOf', () => {
  it('returns the sensor tags', () => {
    expect(tagsOf({ tags: ['a', 'b'] })).toEqual(['a', 'b'])
  })

  it('treats no tags as the untagged sentinel', () => {
    expect(tagsOf({ tags: [] })).toEqual([UNTAGGED_TAG])
  })
})

describe('sensorsInScope', () => {
  it('returns only the focused sensor in sensor mode', () => {
    expect(sensorsInScope(focused, all, { mode: 'sensor' }).map(x => x.id)).toEqual([1])
  })

  it('returns every sensor of the same type in the same viewer', () => {
    // 4 is a different type, 5 is a different viewer.
    expect(sensorsInScope(focused, all, { mode: 'type' }).map(x => x.id)).toEqual([1, 2, 3])
  })

  it('narrows the type set to one tag', () => {
    expect(sensorsInScope(focused, all, { mode: 'tag', tag: 'roof' }).map(x => x.id)).toEqual([1, 2])
  })

  it('selects untagged sensors via the sentinel', () => {
    expect(sensorsInScope(focused, all, { mode: 'tag', tag: UNTAGGED_TAG }).map(x => x.id))
      .toEqual([1, 3])
  })

  it('always keeps the focused sensor even when it lacks the tag', () => {
    const scoped = sensorsInScope(focused, all, { mode: 'tag', tag: UNTAGGED_TAG })
    expect(scoped.map(x => x.id)).toContain(focused.id)
  })

  it('keeps the focused sensor when it has no type', () => {
    const typeless = s(9, null, ['north'])
    expect(sensorsInScope(typeless, [...all, typeless], { mode: 'type' }).map(x => x.id))
      .toEqual([9])
  })

  it('falls back to the whole type set when no tag is given', () => {
    expect(sensorsInScope(focused, all, { mode: 'tag', tag: null }).map(x => x.id))
      .toEqual([1, 2, 3])
  })

  it('sorts by id so a line keeps its position between polls', () => {
    const shuffled = [all[2], all[1], all[0]]
    expect(sensorsInScope(focused, shuffled, { mode: 'type' }).map(x => x.id)).toEqual([1, 2, 3])
  })
})

describe('tagsForScope', () => {
  it('lists the tags used within the type, untagged last', () => {
    expect(tagsForScope(focused, all)).toEqual(['north', 'roof', UNTAGGED_TAG])
  })

  it('ignores tags from other types and other viewers', () => {
    const other = [focused, s(6, 20, ['basement']), s(7, 10, ['attic'], ViewerNames.map)]
    expect(tagsForScope(focused, other)).toEqual(['north'])
  })

  it('returns nothing usable when the focused sensor has no type', () => {
    expect(tagsForScope(s(9, null, ['x']), all)).toEqual([])
  })
})
