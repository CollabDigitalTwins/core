// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { SCALABLE_OBJECT_PLACEMENT } from '../../../shared/placement/placementTarget'

import { anchorAfterDrag, anchorToPosition, mapPlacementTarget, positionToAnchor } from './mapPlacementTarget'

import type { MapAnchor } from './mapPlacementGeo'

const ANCHOR: MapAnchor = { lng: -75.695, lat: 45.42, elevation: 74 }

function setUp(anchor: MapAnchor = ANCHOR) {
  const root = new THREE.Object3D()
  let current = { ...anchor }
  const previews: { anchor: MapAnchor, rotation: number, scale: number }[] = []
  const updateFile = vi.fn().mockResolvedValue(undefined)

  const target = mapPlacementTarget({
    id: '7',
    name: 'tower.glb',
    object: () => root,
    anchor: () => current,
    preview: (next, rotation, scale) => {
      current = next
      previews.push({ anchor: next, rotation, scale })
    },
    updateFile,
    capabilities: SCALABLE_OBJECT_PLACEMENT,
  })

  return { target, root, previews, updateFile, anchorNow: () => current }
}

describe('mapPlacementTarget', () => {
  it('reads its position as the anchor, not the object', () => {
    const { target, root } = setUp()
    root.position.set(500, 500, 500)

    expect(target.read().position).toEqual([ANCHOR.lng, ANCHOR.elevation, ANCHOR.lat])
  })

  it('returns the subject to the origin so a drag is never applied twice', () => {
    const { target, root } = setUp()
    root.position.set(120, 0, -40)

    target.apply({ ...target.read(), position: anchorToPosition({ lng: -75.69, lat: 45.42, elevation: 74 }) })

    expect(root.position.toArray()).toEqual([0, 0, 0])
  })

  it('moves the anchor rather than the object when a placement is applied', () => {
    const { target, previews, anchorNow } = setUp()

    target.apply({ ...target.read(), position: [-75.69, 80, 45.43] })

    expect(previews).toHaveLength(1)
    expect(anchorNow()).toEqual({ lng: -75.69, elevation: 80, lat: 45.43 })
  })

  it('commits geography and degrees, never scene metres', async () => {
    const { target, updateFile } = setUp()

    await target.commit({
      position: [-75.69, 80, 45.43],
      rotation: [0, Math.PI / 2, 0],
      scale: 2,
      sourceUp: 'y',
    })

    expect(updateFile).toHaveBeenCalledWith({
      lng: -75.69,
      lat: 45.43,
      elevation: 80,
      rotation: 90,
      scale: 2,
    })
  })

  it('drops scale for a target that cannot store one', async () => {
    const root = new THREE.Object3D()
    const updateFile = vi.fn().mockResolvedValue(undefined)
    const target = mapPlacementTarget({
      id: '7',
      name: 'plan.dxf',
      object: () => root,
      anchor: () => ANCHOR,
      preview: () => {},
      updateFile,
      capabilities: { rotation: 'yaw', scale: false },
    })

    await target.commit({ position: anchorToPosition(ANCHOR), rotation: [0, 0, 0], scale: 5, sourceUp: 'y' })

    expect(updateFile.mock.calls[0][0]).not.toHaveProperty('scale')
  })

  it('round-trips an anchor through the position ordering the card reads', () => {
    expect(positionToAnchor(anchorToPosition(ANCHOR))).toEqual(ANCHOR)
  })
})

describe('anchorAfterDrag', () => {
  it('turns a scene-metre drag into the anchor it lands on', () => {
    const moved = anchorAfterDrag(ANCHOR, new THREE.Vector3(100, 10, 0))

    expect(moved.lng).toBeGreaterThan(ANCHOR.lng)
    expect(moved.elevation).toBeCloseTo(84, 9)
    expect(moved.lat).toBeCloseTo(ANCHOR.lat, 9)
  })

  it('reads +Z as south, matching the scene the layer draws into', () => {
    expect(anchorAfterDrag(ANCHOR, new THREE.Vector3(0, 0, 100)).lat).toBeLessThan(ANCHOR.lat)
  })
})

describe('applyDrag', () => {
  it('reads the dragged object as metres and previews the anchor it lands on', () => {
    const { target, root, previews } = setUp()

    root.position.set(100, 10, 0)
    target.applyDrag?.(root)

    expect(previews).toHaveLength(1)
    expect(previews[0].anchor.lng).toBeGreaterThan(ANCHOR.lng)
    expect(previews[0].anchor.elevation).toBeCloseTo(84, 9)
    expect(previews[0].anchor.lat).toBeCloseTo(ANCHOR.lat, 9)
  })

  it('returns the subject to the origin so the next drag is measured from scratch', () => {
    const { target, root } = setUp()

    root.position.set(50, 0, 50)
    target.applyDrag?.(root)

    expect(root.position.toArray()).toEqual([0, 0, 0])
  })

  it('keeps the rotation and scale a card edit already applied', () => {
    const { target, root, previews } = setUp()

    target.apply({
      ...target.read(),
      rotation: [0, Math.PI / 2, 0],
      scale: 3,
    })
    root.position.set(10, 0, 0)
    target.applyDrag?.(root)

    const last = previews[previews.length - 1]
    expect(last.rotation).toBeCloseTo(Math.PI / 2, 9)
    expect(last.scale).toBe(3)
  })
})

describe('applyDrag, turning and scaling', () => {
  it('previews the yaw the gizmo turned the subject to', () => {
    const { target, root, previews } = setUp()

    root.rotation.y = Math.PI / 4
    target.applyDrag?.(root)

    expect(previews[previews.length - 1].rotation).toBeCloseTo(Math.PI / 4, 9)
  })

  it('reads a turn as where the subject now stands, not as one more turn on top', () => {
    const { target, root, previews } = setUp()

    root.rotation.y = Math.PI / 4
    target.applyDrag?.(root)
    root.rotation.y = Math.PI / 2
    target.applyDrag?.(root)

    expect(previews[previews.length - 1].rotation).toBeCloseTo(Math.PI / 2, 9)
  })

  it('previews the factor the gizmo scaled the subject by', () => {
    const { target, root, previews } = setUp()

    root.scale.setScalar(2.5)
    target.applyDrag?.(root)

    expect(previews[previews.length - 1].scale).toBeCloseTo(2.5, 9)
  })

  it('leaves the turn and the scale on the subject, which is what the gizmo measures from', () => {
    const { target, root } = setUp()

    root.rotation.y = Math.PI / 3
    root.scale.setScalar(2)
    target.applyDrag?.(root)

    expect(root.rotation.y).toBeCloseTo(Math.PI / 3, 9)
    expect(root.scale.x).toBeCloseTo(2, 9)
  })

  it('builds the next drag on a card edit rather than discarding it', () => {
    const { target, root, previews } = setUp()

    root.rotation.y = Math.PI / 4
    root.scale.setScalar(2)
    target.applyDrag?.(root)
    target.apply({ ...target.read(), rotation: [0, Math.PI, 0], scale: 4 })
    target.applyDrag?.(root)

    const last = previews[previews.length - 1]
    expect(last.rotation).toBeCloseTo(Math.PI, 9)
    expect(last.scale).toBeCloseTo(4, 9)
  })
})

