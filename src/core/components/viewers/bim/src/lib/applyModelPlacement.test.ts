// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { applyModelPlacement } from './applyModelPlacement'

describe('applyModelPlacement', () => {
  it('moves the model to its stored coordinates', () => {
    const object = new THREE.Object3D()

    applyModelPlacement(object, { fileTransformX: 1, fileTransformY: 2, fileTransformZ: 3, fileRotationY: null })

    expect(object.position.toArray()).toEqual([1, 2, 3])
  })

  it('leaves an unplaced model at the origin rather than at NaN', () => {
    const object = new THREE.Object3D()
    object.position.set(9, 9, 9)

    applyModelPlacement(object, { fileTransformX: null, fileTransformY: null, fileTransformZ: null, fileRotationY: null })

    expect(object.position.toArray()).toEqual([0, 0, 0])
  })

  it('applies the yaw stored for the BIM scene', () => {
    const object = new THREE.Object3D()

    applyModelPlacement(object, { fileTransformX: 0, fileTransformY: 0, fileTransformZ: 0, fileRotationY: Math.PI / 2 })

    expect(object.rotation.y).toBeCloseTo(Math.PI / 2)
  })

  it('keeps the existing rotation when none was stored', () => {
    const object = new THREE.Object3D()
    object.rotation.y = 0.5

    applyModelPlacement(object, { fileTransformX: 0, fileTransformY: 0, fileTransformZ: 0, fileRotationY: null })

    expect(object.rotation.y).toBe(0.5)
  })

  it('flushes the world matrix, or the move lands a frame late', () => {
    const object = new THREE.Object3D()
    const update = vi.spyOn(object, 'updateMatrixWorld')

    applyModelPlacement(object, { fileTransformX: 1, fileTransformY: 0, fileTransformZ: 0, fileRotationY: null })

    expect(update).toHaveBeenCalledWith(true)
  })
})
