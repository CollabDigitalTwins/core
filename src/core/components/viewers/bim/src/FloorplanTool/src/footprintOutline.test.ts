// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { outlineFromTriangles, trianglesArea } from './footprintOutline'

const tri = (...xz: number[]) => [xz[0], 0, xz[1], xz[2], 0, xz[3], xz[4], 0, xz[5]]

// A 4 × 2 rectangle split along its diagonal.
const rectangle = [...tri(0, 0, 4, 0, 4, 2), ...tri(0, 0, 4, 2, 0, 2)]

const square = (x: number, z: number) => [...tri(x, z, x + 1, z, x + 1, z + 1), ...tri(x, z, x + 1, z + 1, x, z + 1)]
const lShape = [...square(0, 0), ...square(1, 0), ...square(0, 1)]

describe('trianglesArea', () => {
  it('sums plan area', () => {
    expect(trianglesArea(rectangle)).toBeCloseTo(8)
    expect(trianglesArea(lShape)).toBeCloseTo(3)
  })
})

describe('outlineFromTriangles', () => {
  it('drops the shared diagonal of a rectangle', () => {
    const outline = outlineFromTriangles(rectangle)
    expect(outline).toHaveLength(4)
    expect(outline).toEqual(expect.arrayContaining([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 2 }, { x: 0, z: 2 }]))
  })

  it('traces an L without its interior seams or collinear points', () => {
    const outline = outlineFromTriangles(lShape)
    expect(outline).toHaveLength(6)
    expect(outline).toEqual(expect.arrayContaining([{ x: 2, z: 0 }, { x: 1, z: 2 }]))
  })

  it('returns nothing for no triangles', () => {
    expect(outlineFromTriangles([])).toEqual([])
  })
})
