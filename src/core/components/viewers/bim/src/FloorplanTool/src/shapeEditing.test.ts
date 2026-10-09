// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { containsPoint, insertVertex, moveEdge, moveVertex, nearestEdge, nearestVertexIndex, removeVertex } from './shapeEditing'

const square = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 4 }, { x: 0, z: 4 }]

describe('shapeEditing', () => {
  it('finds the corner within the radius, else nothing', () => {
    expect(nearestVertexIndex(square, { x: 3.8, z: 4.1 }, 0.5)).toBe(2)
    expect(nearestVertexIndex(square, { x: 2, z: 2 }, 0.5)).toBeNull()
  })

  it('finds the edge under the point, including the closing one', () => {
    expect(nearestEdge(square, { x: 2, z: 0.2 }, 0.5)).toEqual({ index: 0, point: { x: 2, z: 0 } })
    expect(nearestEdge(square, { x: -0.1, z: 2 }, 0.5)?.index).toBe(3)
    expect(nearestEdge(square, { x: 2, z: 2 }, 0.5)).toBeNull()
  })

  it('moves a corner, or both ends of an edge', () => {
    expect(moveVertex(square, 1, { x: 5, z: 1 })[1]).toEqual({ x: 5, z: 1 })
    expect(moveEdge(square, 3, { x: -1, z: 0 })).toEqual([{ x: -1, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 4 }, { x: -1, z: 4 }])
  })

  it('inserts a corner after an index and removes one down to a triangle', () => {
    const five = insertVertex(square, 0, { x: 2, z: -1 })
    expect(five[1]).toEqual({ x: 2, z: -1 })
    expect(five).toHaveLength(5)
    const triangle = removeVertex(removeVertex(five, 1), 0)
    expect(triangle).toHaveLength(3)
    expect(removeVertex(triangle, 0)).toHaveLength(3)
  })

  it('tests containment for concave outlines', () => {
    const ell = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 1 }, { x: 1, z: 1 }, { x: 1, z: 4 }, { x: 0, z: 4 }]
    expect(containsPoint(ell, { x: 0.5, z: 3 })).toBe(true)
    expect(containsPoint(ell, { x: 3, z: 3 })).toBe(false)
  })
})
