// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { fitsBeside, intersect, placeCard, visiblePart } from './placement'

import type { Box } from './placement'

const VIEWPORT = { width: 1600, height: 900 }
const CARD = { width: 360, height: 300 }

const asBox = (placed: { left: number; top: number }): Box => ({ ...placed, ...CARD })
const insideViewport = (b: Box) => b.left >= 16 && b.top >= 16 && b.left + b.width <= 1584 && b.top + b.height <= 884

describe('placeCard', () => {
  it('centres the card without a target', () => {
    const placed = asBox(placeCard(null, CARD, VIEWPORT))
    expect(Math.abs(placed.left + 180 - 800)).toBeLessThanOrEqual(8)
    expect(Math.abs(placed.top + 150 - 450)).toBeLessThanOrEqual(8)
  })

  it('puts the card next to the target without covering it', () => {
    const target = { left: 60, top: 100, width: 400, height: 80 }
    const placed = asBox(placeCard(target, CARD, VIEWPORT))
    const near = { left: target.left - 24, top: target.top - 24, width: target.width + 48, height: target.height + 48 }
    expect(intersect(placed, target)).toBeNull()
    expect(intersect(placed, near)).not.toBeNull()
  })

  it('keeps the card inside the viewport when the target sits low', () => {
    expect(insideViewport(asBox(placeCard({ left: 60, top: 820, width: 400, height: 60 }, CARD, VIEWPORT)))).toBe(true)
  })

  it('stays clear of the panels it is told to avoid', () => {
    const target = { left: 700, top: 300, width: 300, height: 80 }
    const avoid = [{ left: 680, top: 250, width: 420, height: 600 }, { left: 0, top: 400, width: 450, height: 500 }]
    const placed = asBox(placeCard(target, CARD, VIEWPORT, avoid))
    expect([target, ...avoid].map(b => intersect(placed, b))).toEqual([null, null, null])
    expect(insideViewport(placed)).toBe(true)
  })

  it('shortens the card rather than cover a wide target with no room around it', () => {
    const viewport = { width: 1600, height: 800 }
    const card = { width: 360, height: 600 }
    const target = { left: 20, top: 380, width: 1560, height: 140 }
    const placed = placeCard(target, card, viewport)
    expect(placed.maxHeight).toBeGreaterThanOrEqual(200)
    expect(placed.maxHeight).toBeLessThan(600)
    expect(intersect({ left: placed.left, top: placed.top, width: 360, height: placed.maxHeight ?? 600 }, target)).toBeNull()
  })

  it('sits over a target that fills the screen, still clear of the panels', () => {
    const target = { left: 0, top: 0, width: 1600, height: 900 }
    const toolbar = { left: 600, top: 400, width: 400, height: 100 }
    const placed = asBox(placeCard(target, CARD, VIEWPORT, [toolbar]))
    expect(intersect(placed, toolbar)).toBeNull()
    expect(insideViewport(placed)).toBe(true)
  })
})

describe('fitsBeside', () => {
  it('is false for a target spanning the page and true for a narrow panel', () => {
    expect(fitsBeside({ left: 20, top: 0, width: 1560, height: 100 }, 360, 1600)).toBe(false)
    expect(fitsBeside({ left: 20, top: 0, width: 400, height: 100 }, 360, 1600)).toBe(true)
  })
})

describe('visiblePart', () => {
  it('clips a tall target to the viewport', () => {
    expect(visiblePart({ left: 10, top: 600, width: 100, height: 1000 }, VIEWPORT)).toEqual({ left: 10, top: 600, width: 100, height: 300 })
  })

  it('is null for a target scrolled out of view', () => {
    expect(visiblePart({ left: 10, top: 1000, width: 100, height: 50 }, VIEWPORT)).toBeNull()
  })
})
