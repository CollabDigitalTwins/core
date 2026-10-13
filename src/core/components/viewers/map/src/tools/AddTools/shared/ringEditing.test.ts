// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { insertCorner, moveCorner, nearestCornerIndex, nearestEdgeIndex, removeCorner } from './ringEditing'

import type { Ring } from '../../../MapLayers/src/SiteLayer/siteGeometry'

const square = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]
const ring: Ring = [[0, 0], [1, 0], [1, 1]]

describe('nearestCornerIndex', () => {
  it('finds the closest corner inside the threshold', () => {
    expect(nearestCornerIndex(square, { x: 97, y: 4 }, 10)).toBe(1)
  })

  it('returns -1 when no corner is close enough', () => {
    expect(nearestCornerIndex(square, { x: 50, y: 50 }, 10)).toBe(-1)
  })
})

describe('nearestEdgeIndex', () => {
  it('finds the edge under the pointer', () => {
    expect(nearestEdgeIndex(square, { x: 50, y: 3 }, 6)).toBe(0)
  })

  it('includes the closing edge of a ring', () => {
    expect(nearestEdgeIndex(square, { x: 2, y: 50 }, 6)).toBe(3)
  })

  it('has no closing edge with only two corners', () => {
    expect(nearestEdgeIndex(square.slice(0, 2), { x: 50, y: 50 }, 6)).toBe(-1)
  })

  it('returns -1 away from every edge', () => {
    expect(nearestEdgeIndex(square, { x: 50, y: 50 }, 6)).toBe(-1)
  })
})

describe('corner edits', () => {
  it('inserts after the given corner', () => {
    expect(insertCorner(ring, 0, [0.5, 0])).toEqual([[0, 0], [0.5, 0], [1, 0], [1, 1]])
  })

  it('inserts on the closing edge at the end', () => {
    expect(insertCorner(ring, 2, [0.5, 0.5])).toEqual([[0, 0], [1, 0], [1, 1], [0.5, 0.5]])
  })

  it('removes a corner', () => {
    expect(removeCorner(ring, 1)).toEqual([[0, 0], [1, 1]])
  })

  it('moves a corner without touching the others', () => {
    expect(moveCorner(ring, 2, [2, 2])).toEqual([[0, 0], [1, 0], [2, 2]])
  })
})
