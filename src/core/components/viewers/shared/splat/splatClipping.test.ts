// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'


import { sdfTransformForPlane, syncClipSdfs } from './splatClipping'

import type { ClipEdit, ClipSdf } from './splatClipping'

const sdfLocal = (plane: THREE.Plane, point: THREE.Vector3) => {
  const { position, quaternion } = sdfTransformForPlane(plane)
  const world = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1))
  return point.clone().applyMatrix4(world.invert())
}

const fakeSdf = (): ClipSdf => ({
  position: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  updateMatrixWorld: vi.fn(),
  removeFromParent: vi.fn(),
})

const fakeEdit = () => {
  const edit: ClipEdit & { added: ClipSdf[] } = { sdfs: [], added: [], add: (sdf) => { edit.added.push(sdf) } }
  return edit
}

const planeAt = (y: number) => new THREE.Plane(new THREE.Vector3(0, 1, 0), -y)

describe('sdfTransformForPlane', () => {
  it('puts the origin-crossing XY plane at the origin', () => {
    const { position } = sdfTransformForPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
    expect(position.length()).toBeCloseTo(0)
  })

  it('offsets along the normal by -constant', () => {
    expect(sdfTransformForPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -3)).position.y).toBeCloseTo(3)
  })

  it('orients local +Z onto the plane normal', () => {
    const normal = new THREE.Vector3(1, 2, 3).normalize()
    const { quaternion } = sdfTransformForPlane(new THREE.Plane(normal, 0))
    expect(new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).angleTo(normal)).toBeCloseTo(0)
  })

  // Spark inverts the sdf's world matrix, so local z must be three's own signed distance.
  it('gives a local z that matches the signed distance to the plane', () => {
    const plane = planeAt(2)
    for (const point of [new THREE.Vector3(0, 5, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(3, -4, 7)]) {
      expect(sdfLocal(plane, point).z).toBeCloseTo(plane.distanceToPoint(point))
    }
  })

  it('matches signed distance for a tilted plane too', () => {
    const plane = new THREE.Plane(new THREE.Vector3(1, 2, -1).normalize(), 1.7)
    const point = new THREE.Vector3(4, -2, 3)
    expect(sdfLocal(plane, point).z).toBeCloseTo(plane.distanceToPoint(point))
  })
})

describe('syncClipSdfs', () => {
  it('builds one cutting sdf per plane and parents each to the edit', () => {
    const edit = fakeEdit()
    syncClipSdfs(edit, [planeAt(0), planeAt(1)], fakeSdf)
    expect(edit.sdfs).toHaveLength(2)
    expect(edit.added).toHaveLength(2)
  })

  it('reuses the existing sdfs rather than reallocating, so Spark capacity is stable', () => {
    const edit = fakeEdit()
    syncClipSdfs(edit, [planeAt(0)], fakeSdf)
    const first = edit.sdfs![0]

    syncClipSdfs(edit, [planeAt(5)], fakeSdf)

    expect(edit.sdfs![0]).toBe(first)
    expect(edit.added).toHaveLength(1)
  })

  it('detaches the sdfs it drops, not just forgets them', () => {
    const edit = fakeEdit()
    syncClipSdfs(edit, [planeAt(0), planeAt(1)], fakeSdf)
    const dropped = edit.sdfs![1]

    syncClipSdfs(edit, [planeAt(0)], fakeSdf)

    expect(edit.sdfs).toHaveLength(1)
    expect(dropped.removeFromParent).toHaveBeenCalled()
  })

  it('drops every sdf when the last plane is removed', () => {
    const edit = fakeEdit()
    syncClipSdfs(edit, [planeAt(0)], fakeSdf)
    syncClipSdfs(edit, [], fakeSdf)
    expect(edit.sdfs).toHaveLength(0)
  })

  it('moves an existing sdf onto the new plane when one is dragged', () => {
    const edit = fakeEdit()
    syncClipSdfs(edit, [planeAt(0)], fakeSdf)
    syncClipSdfs(edit, [planeAt(4)], fakeSdf)
    expect(edit.sdfs![0].position.y).toBeCloseTo(4)
  })

  it('starts from an edit whose sdfs Spark left null', () => {
    const edit: ClipEdit & { added: ClipSdf[] } = { sdfs: null, added: [], add: (sdf) => { edit.added.push(sdf) } }
    syncClipSdfs(edit, [planeAt(0)], fakeSdf)
    expect(edit.sdfs).toHaveLength(1)
  })
})
