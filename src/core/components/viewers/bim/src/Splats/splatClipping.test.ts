// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { SplatEdit } from '@sparkjsdev/spark'
import * as THREE from 'three'
import { describe, it, expect } from 'vitest'


import { sdfTransformForPlane, syncClipSdfs } from './splatClipping'

const sdfLocal = (plane: THREE.Plane, point: THREE.Vector3) => {
  const { position, quaternion } = sdfTransformForPlane(plane)
  const world = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1))
  return point.clone().applyMatrix4(world.invert())
}

describe('sdfTransformForPlane', () => {
  it('puts the origin-crossing XY plane at the origin', () => {
    const { position } = sdfTransformForPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
    expect(position.length()).toBeCloseTo(0)
  })

  it('offsets along the normal by -constant', () => {
    const { position } = sdfTransformForPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -3))
    expect(position.y).toBeCloseTo(3)
  })

  it('orients local +Z onto the plane normal', () => {
    const normal = new THREE.Vector3(1, 2, 3).normalize()
    const { quaternion } = sdfTransformForPlane(new THREE.Plane(normal, 0))
    expect(new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).angleTo(normal)).toBeCloseTo(0)
  })

  // Spark cuts where `sdfPos.z` is negative, which must be three's own negative half-space.
  it('gives a local z that matches three\'s signed distance to the plane', () => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0).normalize(), -2)
    for (const point of [new THREE.Vector3(0, 5, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(3, -4, 7)]) {
      expect(sdfLocal(plane, point).z).toBeCloseTo(plane.distanceToPoint(point))
    }
  })

  it('matches signed distance for a tilted plane too', () => {
    const plane = new THREE.Plane(new THREE.Vector3(1, 1, 0).normalize(), 1.5)
    const point = new THREE.Vector3(2, -3, 4)
    expect(sdfLocal(plane, point).z).toBeCloseTo(plane.distanceToPoint(point))
  })
})

describe('syncClipSdfs', () => {
  it('builds one cutting sdf per plane', () => {
    const edit = new SplatEdit({ sdfs: [] })
    const planes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)]
    syncClipSdfs(edit, planes)

    expect(edit.sdfs).toHaveLength(2)
  })

  it('reuses the existing sdfs rather than reallocating, so Spark\'s capacity is stable', () => {
    const edit = new SplatEdit({ sdfs: [] })
    syncClipSdfs(edit, [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)])
    const first = edit.sdfs?.[0]

    syncClipSdfs(edit, [new THREE.Plane(new THREE.Vector3(1, 0, 0), 2)])
    expect(edit.sdfs?.[0]).toBe(first)
  })

  it('drops the sdfs when every plane is removed', () => {
    const edit = new SplatEdit({ sdfs: [] })
    syncClipSdfs(edit, [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)])
    syncClipSdfs(edit, [])

    expect(edit.sdfs).toHaveLength(0)
  })
})
