// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { DRAG_SLOP_PX, beginPress, opensMenu, trackPress } from './contextMenuGesture'

const drag = (from: { x: number; y: number }, ...points: [number, number][]) =>
  points.reduce((press, [x, y]) => trackPress(press, x, y), beginPress(from.x, from.y))

describe('right-press gesture', () => {
  it('opens the menu for a press that never moved', () => {
    expect(opensMenu(beginPress(100, 100))).toBe(true)
  })

  it('opens the menu for the jitter of a hand-held click', () => {
    const press = drag({ x: 100, y: 100 }, [102, 101], [100, 103])

    expect(opensMenu(press)).toBe(true)
  })

  it('withholds the menu once the press pans past the slop', () => {
    const press = drag({ x: 100, y: 100 }, [140, 100])

    expect(opensMenu(press)).toBe(false)
  })

  it('stays withheld after a pan returns to where it started', () => {
    const press = drag({ x: 100, y: 100 }, [300, 300], [100, 100])

    expect(opensMenu(press)).toBe(false)
  })

  it('treats the slop as inclusive, so exactly at the edge is still a click', () => {
    expect(opensMenu(trackPress(beginPress(0, 0), DRAG_SLOP_PX, 0))).toBe(true)
    expect(opensMenu(trackPress(beginPress(0, 0), DRAG_SLOP_PX + 1, 0))).toBe(false)
  })

  it('measures diagonally rather than per axis', () => {
    expect(opensMenu(trackPress(beginPress(0, 0), 4, 4))).toBe(false)
  })

  it('opens nothing when there was no press at all', () => {
    expect(opensMenu(null)).toBe(false)
  })

  it('leaves an unmoved press untouched, so tracking allocates nothing per move', () => {
    const press = beginPress(10, 10)

    expect(trackPress(press, 11, 11)).toBe(press)
  })
})
