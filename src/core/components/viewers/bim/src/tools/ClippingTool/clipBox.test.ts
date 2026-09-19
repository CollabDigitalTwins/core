// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { sdfTransformForPlane } from '../../../../shared/splat/splatClipping'

import {
  boxClipPlanes,
  CLIP_BOX_FACES,
  colourForFace,
  faceCentre,
  faceOutwardNormal,
  fittedBox,
  handleCentre,
  helperShellSize,
  MIN_CLIP_BOX_SIZE,
  moveFace,
} from './clipBox'

const box = () => new THREE.Box3(new THREE.Vector3(-1, -2, -3), new THREE.Vector3(4, 5, 6))

describe('boxClipPlanes', () => {
  it('is one plane per face', () => {
    expect(boxClipPlanes(box())).toHaveLength(6)
  })

  it('keeps a point inside the box on every plane', () => {
    const inside = new THREE.Vector3(0, 0, 0)

    for (const plane of boxClipPlanes(box())) {
      expect(plane.distanceToPoint(inside)).toBeGreaterThan(0)
    }
  })

  it('rejects a point outside on exactly the plane it crossed', () => {
    const planes = boxClipPlanes(box())
    const beyondMaxX = new THREE.Vector3(9, 0, 0)

    const rejecting = planes.filter((plane) => plane.distanceToPoint(beyondMaxX) < 0)

    expect(rejecting).toHaveLength(1)
  })

  it('puts a point exactly on a face at the boundary rather than outside', () => {
    const onMaxY = new THREE.Vector3(0, 5, 0)

    for (const plane of boxClipPlanes(box())) {
      expect(plane.distanceToPoint(onMaxY)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('faceOutwardNormal', () => {
  it('points away from the box centre on every face', () => {
    const centre = box().getCenter(new THREE.Vector3())

    for (const face of CLIP_BOX_FACES) {
      const outward = faceCentre(box(), face).sub(centre)
      expect(faceOutwardNormal(face).dot(outward)).toBeGreaterThan(0)
    }
  })
})

describe('faceCentre', () => {
  it('sits on the face it names, centred in the other two axes', () => {
    expect(faceCentre(box(), 'x+').toArray()).toEqual([4, 1.5, 1.5])
    expect(faceCentre(box(), 'y-').toArray()).toEqual([1.5, -2, 1.5])
    expect(faceCentre(box(), 'z+').toArray()).toEqual([1.5, 1.5, 6])
  })
})

describe('moveFace', () => {
  it('moves only the named face', () => {
    const moved = moveFace(box(), 'x+', new THREE.Vector3(2, 99, 99))

    expect(moved.max.x).toBe(2)
    expect(moved.min.toArray()).toEqual([-1, -2, -3])
    expect(moved.max.y).toBe(5)
    expect(moved.max.z).toBe(6)
  })

  it('moves a min face too', () => {
    expect(moveFace(box(), 'y-', new THREE.Vector3(0, 1, 0)).min.y).toBe(1)
  })

  it('never lets a face pass its opposite, holding the minimum thickness', () => {
    const crushed = moveFace(box(), 'x+', new THREE.Vector3(-50, 0, 0))

    expect(crushed.max.x).toBeCloseTo(-1 + MIN_CLIP_BOX_SIZE)
    expect(crushed.max.x).toBeGreaterThan(crushed.min.x)
  })

  it('holds the minimum thickness from the other side as well', () => {
    const crushed = moveFace(box(), 'z-', new THREE.Vector3(0, 0, 50))

    expect(crushed.min.z).toBeCloseTo(6 - MIN_CLIP_BOX_SIZE)
  })

  it('leaves the original untouched', () => {
    const original = box()

    moveFace(original, 'x+', new THREE.Vector3(2, 0, 0))

    expect(original.max.x).toBe(4)
  })
})

describe('fittedBox', () => {
  it('pads the target so the box starts just clear of the model', () => {
    const fitted = fittedBox(new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 10, 10)))

    expect(fitted.min.x).toBeLessThan(0)
    expect(fitted.max.x).toBeGreaterThan(10)
    expect(fitted.getCenter(new THREE.Vector3()).toArray()).toEqual([5, 5, 5])
  })

  it('gives an empty or degenerate target a usable box rather than a zero one', () => {
    const fitted = fittedBox(new THREE.Box3())

    expect(fitted.isEmpty()).toBe(false)
    expect(fitted.max.x - fitted.min.x).toBeGreaterThanOrEqual(MIN_CLIP_BOX_SIZE)
  })
})

describe('the helper geometry', () => {
  it('keeps every face handle clear of the box own cut', () => {
    for (const face of CLIP_BOX_FACES) {
      const centre = handleCentre(box(), face, 0.4)

      for (const plane of boxClipPlanes(box())) {
        expect(plane.distanceToPoint(centre)).toBeGreaterThan(0.19)
      }
    }
  })

  it('puts each handle on the face it belongs to', () => {
    expect(handleCentre(box(), 'x+', 0.4).x).toBeLessThan(4)
    expect(handleCentre(box(), 'x+', 0.4).y).toBeCloseTo(1.5)
    expect(handleCentre(box(), 'x-', 0.4).x).toBeGreaterThan(-1)
  })

  it('draws the shell just inside the planes so it is not speckled away', () => {
    const shell = helperShellSize(box())

    expect(shell.x).toBeLessThan(5)
    expect(shell.x).toBeCloseTo(5, 2)
  })

  it('keeps a positive shell on a box crushed to the minimum', () => {
    const minimal = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3().setScalar(MIN_CLIP_BOX_SIZE))

    const shell = helperShellSize(minimal)

    expect(shell.x).toBeGreaterThan(0)
    expect(shell.y).toBeGreaterThan(0)
    expect(shell.z).toBeGreaterThan(0)
  })
})

describe('boxClipPlanes as splat cutting sdfs', () => {
  const box = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1))

  const sdfLocalZ = (plane: THREE.Plane, point: THREE.Vector3) => {
    const { position, quaternion } = sdfTransformForPlane(plane)
    const world = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1))
    return point.clone().applyMatrix4(world.invert()).z
  }

  it('needs only six sdfs, which fits the default budget with no BOX special case', () => {
    expect(boxClipPlanes(box)).toHaveLength(6)
  })

  it('keeps a point inside the box and cuts one outside, matching the AND across planes', () => {
    const planes = boxClipPlanes(box)
    const kept = (point: THREE.Vector3) => planes.every(plane => sdfLocalZ(plane, point) >= 0)

    expect(kept(new THREE.Vector3(0, 0, 0))).toBe(true)
    expect(kept(new THREE.Vector3(0.9, -0.9, 0.5))).toBe(true)
    expect(kept(new THREE.Vector3(2, 0, 0))).toBe(false)
    expect(kept(new THREE.Vector3(0, 0, -5))).toBe(false)
  })
})

describe('colourForFace', () => {
  it('follows three.js axis colours, both faces of an axis alike', () => {
    expect(colourForFace('x-')).toBe(0xff0000)
    expect(colourForFace('x+')).toBe(0xff0000)
    expect(colourForFace('y-')).toBe(0x00ff00)
    expect(colourForFace('y+')).toBe(0x00ff00)
    expect(colourForFace('z-')).toBe(0x0000ff)
    expect(colourForFace('z+')).toBe(0x0000ff)
  })
})
