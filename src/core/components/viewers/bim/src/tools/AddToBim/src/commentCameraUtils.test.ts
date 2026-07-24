// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { computeCommentLookAt } from './commentCameraUtils'

describe('computeCommentLookAt', () => {
  it('targets the comment point exactly', () => {
    const result = computeCommentLookAt(
      { x: 10, y: 10, z: 10 },
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 2, z: -3 },
      8,
    )
    expect(result.tarX).toBe(5)
    expect(result.tarY).toBe(2)
    expect(result.tarZ).toBe(-3)
  })

  it('keeps the current view direction and places the camera at the given distance', () => {
    // Camera looks straight down the +X axis at the origin.
    const result = computeCommentLookAt(
      { x: 4, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      8,
    )
    // Same direction (+X), pulled back to distance 8.
    expect(result.camX).toBeCloseTo(8)
    expect(result.camY).toBeCloseTo(0)
    expect(result.camZ).toBeCloseTo(0)

    const dist = Math.hypot(result.camX - result.tarX, result.camY - result.tarY, result.camZ - result.tarZ)
    expect(dist).toBeCloseTo(8)
  })

  it('preserves the offset direction relative to the new comment target', () => {
    const result = computeCommentLookAt(
      { x: 3, y: 4, z: 0 }, // direction (3,4,0), length 5
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 10, z: 10 },
      10,
    )
    // Unit direction (0.6, 0.8, 0) * 10 offset from the comment point.
    expect(result.camX).toBeCloseTo(16)
    expect(result.camY).toBeCloseTo(18)
    expect(result.camZ).toBeCloseTo(10)
  })

  it('falls back to a diagonal angle when the camera sits on its target', () => {
    const result = computeCommentLookAt(
      { x: 1, y: 1, z: 1 },
      { x: 1, y: 1, z: 1 }, // zero-length direction
      { x: 0, y: 0, z: 0 },
      Math.sqrt(3),
    )
    // Fallback direction (1,1,1) normalized * sqrt(3) === (1,1,1).
    expect(result.camX).toBeCloseTo(1)
    expect(result.camY).toBeCloseTo(1)
    expect(result.camZ).toBeCloseTo(1)
  })

  it('guards against a non-positive distance', () => {
    const result = computeCommentLookAt(
      { x: 2, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      0,
    )
    const dist = Math.hypot(result.camX, result.camY, result.camZ)
    expect(dist).toBeCloseTo(8) // default distance
  })
})
