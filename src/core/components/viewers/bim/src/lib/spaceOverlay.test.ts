// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { footprintFor, type ToDrawingLocal } from './spaceOverlay'

/** The drawing sits at the world origin in these fixtures. */
const identity: ToDrawingLocal = point => point.clone()

/** One triangle, given as three (x, y, z) world corners. */
function triangle(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): number[] {
  return [...a, ...b, ...c]
}

/** A 4 x 2 slab base at y = 0, plus a wall triangle higher up. */
function roomWithWalls(): number[] {
  return [
    ...triangle([0, 0, 0], [4, 0, 0], [4, 0, 2]),
    ...triangle([0, 0, 0], [4, 0, 2], [0, 0, 2]),
    // Vertical face — must not end up in the footprint.
    ...triangle([0, 0, 0], [4, 0, 0], [4, 3, 0]),
    // Ceiling — also excluded.
    ...triangle([0, 3, 0], [4, 3, 0], [4, 3, 2]),
  ]
}

describe('footprintFor', () => {
  it('keeps only the triangles on the solid\'s lowest plane', () => {
    const footprint = footprintFor(roomWithWalls(), identity, null)!

    // Two base triangles = 6 vertices = 18 numbers.
    expect(footprint.triangles).toHaveLength(18)
    // Everything is flattened onto the drawing plane.
    for (let i = 1; i < footprint.triangles.length; i += 3) {
      expect(footprint.triangles[i]).toBe(0)
    }
  })

  it('reports the footprint extent for the X and the centroid for the tag', () => {
    const footprint = footprintFor(roomWithWalls(), identity, null)!

    expect([footprint.min.x, footprint.min.y]).toEqual([0, 0])
    expect([footprint.max.x, footprint.max.y]).toEqual([4, 2])
    expect(footprint.centroid.x).toBeCloseTo(2, 5)
    expect(footprint.centroid.y).toBeCloseTo(1, 5)
  })

  it('follows an L-shaped room rather than filling its bounding box', () => {
    // An L: the square (0,0)-(4,4) with the (2,2)-(4,4) quadrant removed.
    const lShape = [
      ...triangle([0, 0, 0], [4, 0, 0], [4, 0, 2]),
      ...triangle([0, 0, 0], [4, 0, 2], [0, 0, 2]),
      ...triangle([0, 0, 2], [2, 0, 2], [2, 0, 4]),
      ...triangle([0, 0, 2], [2, 0, 4], [0, 0, 4]),
    ]

    const footprint = footprintFor(lShape, identity, null)!

    // Four triangles kept, not the two a bounding rectangle would produce.
    expect(footprint.triangles).toHaveLength(36)
    // The missing quadrant's corner is never emitted.
    const corners: string[] = []
    for (let i = 0; i < footprint.triangles.length; i += 3) {
      corners.push(`${footprint.triangles[i]},${footprint.triangles[i + 2]}`)
    }
    expect(corners).not.toContain('4,4')
  })

  it('applies the drawing transform to every vertex', () => {
    const shift: ToDrawingLocal = point =>
      point.clone().sub(new THREE.Vector3(10, 0, 5))

    const footprint = footprintFor(roomWithWalls(), shift, null)!

    expect([footprint.min.x, footprint.min.y]).toEqual([-10, -5])
    expect([footprint.max.x, footprint.max.y]).toEqual([-6, -3])
  })

  it('falls back to the bounding box when the solid has no flat base', () => {
    // A single sloped triangle: no two vertices share the lowest plane.
    const sloped = triangle([0, 0, 0], [4, 1, 0], [4, 2, 2])
    const box = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(4, 3, 2),
    )

    const footprint = footprintFor(sloped, identity, box)!

    // Two triangles covering the rectangle.
    expect(footprint.triangles).toHaveLength(18)
    expect([footprint.max.x, footprint.max.y]).toEqual([4, 2])
  })

  it('returns null when there is nothing to draw', () => {
    expect(footprintFor([], identity, null)).toBeNull()
    expect(footprintFor([], identity, new THREE.Box3())).toBeNull()
  })

  it('tolerates a slightly uneven base within epsilon', () => {
    const almostFlat = [
      ...triangle([0, 0, 0], [4, 0.005, 0], [4, 0.01, 2]),
    ]

    expect(footprintFor(almostFlat, identity, null)!.triangles).toHaveLength(9)
  })
})
