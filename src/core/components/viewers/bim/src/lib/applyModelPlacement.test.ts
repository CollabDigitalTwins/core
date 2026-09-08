// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { applyModelPlacement } from './applyModelPlacement'

describe('applyModelPlacement', () => {
  it('moves the model to its stored coordinates', () => {
    const object = new THREE.Object3D()

    applyModelPlacement(object, { x: 1, y: 2, z: 3, bimRotation: null })

    expect(object.position.toArray()).toEqual([1, 2, 3])
  })

  it('leaves an unplaced model at the origin rather than at NaN', () => {
    const object = new THREE.Object3D()
    object.position.set(9, 9, 9)

    applyModelPlacement(object, { x: null, y: null, z: null, bimRotation: null })

    expect(object.position.toArray()).toEqual([0, 0, 0])
  })

  it('applies the yaw stored for the BIM scene', () => {
    const object = new THREE.Object3D()

    applyModelPlacement(object, { x: 0, y: 0, z: 0, bimRotation: Math.PI / 2 })

    expect(object.rotation.y).toBeCloseTo(Math.PI / 2)
  })

  it('keeps the existing rotation when none was stored', () => {
    const object = new THREE.Object3D()
    object.rotation.y = 0.5

    applyModelPlacement(object, { x: 0, y: 0, z: 0, bimRotation: null })

    expect(object.rotation.y).toBe(0.5)
  })

  it('flushes the world matrix, or the move lands a frame late', () => {
    const object = new THREE.Object3D()
    const update = vi.spyOn(object, 'updateMatrixWorld')

    applyModelPlacement(object, { x: 1, y: 0, z: 0, bimRotation: null })

    expect(update).toHaveBeenCalledWith(true)
  })
})
