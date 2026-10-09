// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { rayToPlaneY, rectangleCorners, snapRadius, snapToLines, worldPerPixel } from './planPointer'

describe('rayToPlaneY', () => {
  it('hits the plane straight below a top-down ray', () => {
    expect(rayToPlaneY({ x: 3, y: 50, z: -2 }, { x: 0, y: -1, z: 0 }, 1.5)).toEqual({ x: 3, z: -2 })
  })

  it('follows an oblique ray to where it crosses', () => {
    expect(rayToPlaneY({ x: 0, y: 10, z: 0 }, { x: 1, y: -1, z: 0 }, 0)).toEqual({ x: 10, z: 0 })
  })

  it('returns null for a ray parallel to the plane', () => {
    expect(rayToPlaneY({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, 0)).toBeNull()
  })
})

describe('snapRadius', () => {
  it('scales 12 px to world units at the ortho zoom', () => {
    expect(snapRadius({ isOrthographicCamera: true, left: -50, right: 50, zoom: 2 }, 600)).toBeCloseTo(1)
  })

  it('falls back for a perspective camera', () => {
    expect(snapRadius({ left: 0, right: 0 }, 600)).toBe(0.5)
  })
})

describe('worldPerPixel', () => {
  it('is the ortho frustum width over the canvas width at the current zoom', () => {
    expect(worldPerPixel({ isOrthographicCamera: true, left: -50, right: 50, zoom: 2 }, 500)).toBeCloseTo(0.1)
  })
})

describe('snapToLines', () => {
  const segments = new Float32Array([0, 0, 10, 0, 10, 0, 10, 10])

  it('prefers a corner over the edge it ends', () => {
    expect(snapToLines(segments, [], { x: 9.6, z: 0.3 }, 1)).toEqual({ point: { x: 10, z: 0 }, kind: 'vertex' })
  })

  it('lands on the nearest point of an edge away from corners', () => {
    expect(snapToLines(segments, [], { x: 4, z: 0.4 }, 1)).toEqual({ point: { x: 4, z: 0 }, kind: 'edge' })
  })

  it('snaps to extra corners such as points already placed', () => {
    expect(snapToLines(null, [{ x: 3, z: 3 }], { x: 3.2, z: 2.9 }, 1)).toEqual({ point: { x: 3, z: 3 }, kind: 'vertex' })
  })

  it('returns null when nothing is close enough', () => {
    expect(snapToLines(segments, [], { x: 5, z: 5 }, 1)).toBeNull()
  })
})

describe('rectangleCorners', () => {
  it('walks the rectangle from the first corner', () => {
    expect(rectangleCorners({ x: 0, z: 0 }, { x: 4, z: 3 })).toEqual([
      { x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 3 }, { x: 0, z: 3 },
    ])
  })
})
