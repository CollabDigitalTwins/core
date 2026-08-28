// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { DEFAULT_PLACEMENT } from './pointCloudPlacement'
import { applyObjectUpAxis, matrixToPlacement, placementToMatrix, upAxisQuaternion } from './pointCloudTransform'

const near = (v: THREE.Vector3) => [v.x, v.y, v.z].map((n) => Math.round(n * 1e6) / 1e6)

describe('upAxisQuaternion', () => {
  it('sends the scan up axis to world up for Z-up sources', () => {
    const up = new THREE.Vector3(0, 0, 1).applyQuaternion(upAxisQuaternion('z'))
    expect(near(up)).toEqual([0, 1, 0])
  })

  it('leaves a Y-up source untouched', () => {
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(upAxisQuaternion('y'))
    expect(near(up)).toEqual([0, 1, 0])
  })
})

describe('placementToMatrix', () => {
  it('round-trips a placement through a matrix', () => {
    const placement = {
      ...DEFAULT_PLACEMENT,
      position: [3, -4, 5] as [number, number, number],
      rotation: [0.25, -0.5, 0.75] as [number, number, number],
      scale: 2,
    }

    const result = matrixToPlacement(placementToMatrix(placement), placement.sourceUp)

    expect(result.position.map((n) => +n.toFixed(6))).toEqual([3, -4, 5])
    expect(result.rotation.map((n) => +n.toFixed(6))).toEqual([0.25, -0.5, 0.75])
    expect(+result.scale.toFixed(6)).toBe(2)
    expect(result.sourceUp).toBe(placement.sourceUp)
  })

  it('places a point at the placement position when the placement is otherwise neutral', () => {
    const matrix = placementToMatrix({ ...DEFAULT_PLACEMENT, position: [10, 0, -10] })
    const point = new THREE.Vector3(0, 0, 0).applyMatrix4(matrix)
    expect(near(point)).toEqual([10, 0, -10])
  })

  it('scales distances by the placement scale', () => {
    const matrix = placementToMatrix({ ...DEFAULT_PLACEMENT, scale: 3 })
    const point = new THREE.Vector3(1, 0, 0).applyMatrix4(matrix)
    expect(near(point)).toEqual([3, 0, 0])
  })
})

describe('applyObjectUpAxis', () => {
  it('levels a Z-up object onto Y-up and leaves a Y-up one alone', () => {
    const zUp = new THREE.Object3D()
    applyObjectUpAxis(zUp, 'z')
    expect(near(new THREE.Vector3(0, 0, 1).applyQuaternion(zUp.quaternion))).toEqual([0, 1, 0])

    const yUp = new THREE.Object3D()
    applyObjectUpAxis(yUp, 'y')
    expect(near(new THREE.Vector3(0, 1, 0).applyQuaternion(yUp.quaternion))).toEqual([0, 1, 0])
  })
})
