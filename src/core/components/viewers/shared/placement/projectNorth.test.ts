// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import {
  modelYaw,
  normalizeAngle,
  objectProjectNorth,
  projectNorthFromSegment,
  setObjectProjectNorth,
  turnObjectToProjectNorth,
} from './projectNorth'

const turnBy = (radians: number, x: number, z: number) =>
  new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), radians)

describe('projectNorth', () => {
  it('wraps angles into (-π, π]', () => {
    expect(normalizeAngle(3 * Math.PI / 2)).toBeCloseTo(-Math.PI / 2)
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI)
    expect(normalizeAngle(0.25)).toBeCloseTo(0.25)
  })

  it('adds project north to the placement turn', () => {
    expect(modelYaw({ fileRotationY: 0.5, fileRotationZ: 0.25 })).toBeCloseTo(0.75)
    expect(modelYaw({ fileRotationY: null, fileRotationZ: null })).toBe(0)
  })

  it('turns a picked segment onto the world X axis', () => {
    const a = { x: 0, z: 0 }
    const b = { x: Math.cos(0.3), z: Math.sin(0.3) }

    const north = projectNorthFromSegment(0, a, b)!
    const turned = turnBy(north, b.x, b.z)

    expect(turned.z).toBeCloseTo(0)
    expect(Math.abs(turned.x)).toBeCloseTo(1)
  })

  it('takes the shorter turn whichever way the segment was drawn', () => {
    const forward = projectNorthFromSegment(0, { x: 0, z: 0 }, { x: 1, z: 0.1 })!
    const backward = projectNorthFromSegment(0, { x: 1, z: 0.1 }, { x: 0, z: 0 })!

    expect(backward).toBeCloseTo(forward)
    expect(Math.abs(forward)).toBeLessThan(Math.PI / 2)
  })

  it('builds on the project north the model already has', () => {
    expect(projectNorthFromSegment(0.2, { x: 0, z: 0 }, { x: 1, z: Math.tan(0.1) })).toBeCloseTo(0.3)
  })

  it('ignores a zero-length segment', () => {
    expect(projectNorthFromSegment(0, { x: 1, z: 1 }, { x: 1, z: 1 })).toBeNull()
  })

  it('swaps project north on an object without touching its placement turn', () => {
    const object = new THREE.Object3D()
    object.rotation.y = 0.5 + 0.2
    setObjectProjectNorth(object, 0.2)

    turnObjectToProjectNorth(object, -0.1)

    expect(object.rotation.y).toBeCloseTo(0.4)
    expect(objectProjectNorth(object)).toBe(-0.1)
  })
})
