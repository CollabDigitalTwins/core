// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { addSpacesToDrawing, clipSegmentToFootprint, footprintFor, type ToDrawingLocal } from './spaceOverlay'

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

describe('clipSegmentToFootprint', () => {
  // An L: a 4 x 2 slab plus a 2 x 2 slab on its left, so the top-right 2 x 2 is outside.
  const lShape = [
    ...triangle([0, 0, 0], [4, 0, 0], [4, 0, 2]),
    ...triangle([0, 0, 0], [4, 0, 2], [0, 0, 2]),
    ...triangle([0, 0, 2], [2, 0, 2], [2, 0, 4]),
    ...triangle([0, 0, 2], [2, 0, 4], [0, 0, 4]),
  ]

  function pieces(verts: number[]): Array<[number, number, number, number]> {
    const out: Array<[number, number, number, number]> = []
    for (let i = 0; i < verts.length; i += 6) out.push([verts[i], verts[i + 2], verts[i + 3], verts[i + 5]])
    return out
  }

  it('keeps a diagonal that stays inside whole', () => {
    const verts = clipSegmentToFootprint(new THREE.Vector2(0, 2), new THREE.Vector2(4, 0), lShape.slice(0, 18))
    const length = pieces(verts).reduce((sum, [ax, az, bx, bz]) => sum + Math.hypot(bx - ax, bz - az), 0)
    expect(length).toBeCloseTo(Math.hypot(4, 2))
  })

  it('drops the part of a diagonal that crosses the missing corner', () => {
    const verts = clipSegmentToFootprint(new THREE.Vector2(0, 4), new THREE.Vector2(4, 0), lShape)
    for (const [ax, az, bx, bz] of pieces(verts)) {
      for (const [x, z] of [[ax, az], [bx, bz], [(ax + bx) / 2, (az + bz) / 2]]) {
        expect(x > 2 + 1e-9 && z > 2 + 1e-9).toBe(false)
      }
    }
    expect(verts.length).toBeGreaterThan(0)
  })

  it('returns nothing for a segment entirely outside', () => {
    expect(clipSegmentToFootprint(new THREE.Vector2(3, 3), new THREE.Vector2(4, 4), lShape)).toEqual([])
  })
})

describe('addSpacesToDrawing', () => {
  const square = (x: number) => ({
    positions: new Float32Array([x, 0, 0, x + 2, 0, 0, x + 2, 0, 2, x, 0, 2]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  })
  const model = {
    getItemsOfCategories: async () => ({ IFCSPACE: [1, 2] }),
    getBoxes: async () => [new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 3, 2)), new THREE.Box3(new THREE.Vector3(4, 0, 0), new THREE.Vector3(6, 3, 2))],
    getItemsGeometry: async () => [[square(0)], [square(4)]],
    getItemsData: async () => [{ Name: { value: 'A' } }, { Name: { value: 'B' } }],
  }
  const tagTexts = (root: THREE.Object3D) => {
    const texts: string[] = []
    root.traverseVisible((child) => { if ('element' in child) texts.push((child.element as HTMLElement).textContent ?? '') })
    return texts
  }

  it('hides only the rooms it is given, and shows them again', async () => {
    const drawing = { three: new THREE.Group() }
    const built = await addSpacesToDrawing(drawing as never, model, 0)

    built!.handle.setHidden(new Set([1]))
    expect(tagTexts(drawing.three)).toEqual(['B'])

    built!.handle.setHidden(new Set())
    expect(tagTexts(drawing.three)).toEqual(['A', 'B'])
    built!.handle.dispose()
  })
})
