// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { canPickPlaneForDrawing, planeDrawingNumber } from './planeDrawing'

import type { ClippingPlaneInfo } from './ClippingPlanes'

const plane = (key: string): ClippingPlaneInfo => ({
  key,
  normal: new THREE.Vector3(0, 0, 1),
  point: new THREE.Vector3(),
})

describe('canPickPlaneForDrawing', () => {
  it('is false with no planes', () => {
    expect(canPickPlaneForDrawing([])).toBe(false)
  })

  it('is true from a single plane up', () => {
    expect(canPickPlaneForDrawing([plane('plane-0')])).toBe(true)
    expect(canPickPlaneForDrawing([plane('plane-0'), plane('plane-1')])).toBe(true)
  })
})

describe('planeDrawingNumber', () => {
  it('numbers the planes from one, in list order', () => {
    const planes = [plane('plane-4'), plane('plane-7')]
    expect(planeDrawingNumber(planes, 'plane-4')).toBe(1)
    expect(planeDrawingNumber(planes, 'plane-7')).toBe(2)
  })

  it('falls back to the end of the list for a key that is already gone', () => {
    expect(planeDrawingNumber([plane('plane-0')], 'plane-9')).toBe(2)
  })
})
