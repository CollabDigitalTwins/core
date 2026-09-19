// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { applySplatUpAxis, DEFAULT_SPLAT_PLACEMENT, splatUpFixQuaternion } from './splatUpAxis'

const up = (sourceUp: 'y' | 'z') =>
  new THREE.Vector3(0, 1, 0).applyQuaternion(splatUpFixQuaternion(sourceUp))

describe('splatUpFixQuaternion', () => {
  it('turns a y-down source the right way up', () => {
    const corrected = up('y')
    expect(corrected.y).toBeCloseTo(-1)
    expect(corrected.x).toBeCloseTo(0)
  })

  it('stands a z-up source upright, matching the point cloud correction', () => {
    const corrected = new THREE.Vector3(0, 0, 1).applyQuaternion(splatUpFixQuaternion('z'))
    expect(corrected.y).toBeCloseTo(1)
    expect(corrected.z).toBeCloseTo(0)
  })
})

describe('applySplatUpAxis', () => {
  it('writes the correction onto the object rather than the global up', () => {
    const object = new THREE.Object3D()
    applySplatUpAxis(object, 'y')
    expect(object.quaternion.x).toBeCloseTo(1)
    expect(THREE.Object3D.DEFAULT_UP.y).toBe(1)
  })
})

describe('DEFAULT_SPLAT_PLACEMENT', () => {
  it('defaults to the flipped source the training pipelines emit', () => {
    expect(DEFAULT_SPLAT_PLACEMENT.sourceUp).toBe('y')
    expect(DEFAULT_SPLAT_PLACEMENT.scale).toBe(1)
  })
})
