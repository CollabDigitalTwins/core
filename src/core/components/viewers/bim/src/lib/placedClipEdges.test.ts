// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { withModelPlacement } from './placedClipEdges'

import type { ClipEdgesInternals } from './placedClipEdges'

function placedModel() {
  const object = new THREE.Object3D()
  object.rotation.y = Math.PI / 5
  object.position.set(12, 1, -4)
  object.updateMatrixWorld(true)
  return { object }
}

function makeEdges(model: { object: THREE.Object3D } | undefined, worldPlane: THREE.Plane) {
  const fills = new THREE.Mesh()
  fills.position.set(0, 0, 1)
  const fragments = { list: new Map(model ? [['m', model]] : []) }
  const edges = {
    plane: worldPlane,
    _components: { get: (cls: unknown) => (cls === OBC.FragmentsManager ? fragments : null) },
    getStyleMeshes: async () => ({ fills }),
  } as unknown as ClipEdgesInternals
  return { edges, fills }
}

describe('withModelPlacement', () => {
  it('cuts with the plane in the model\'s unplaced frame', async () => {
    const model = placedModel()
    const worldPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -3)
    const { edges } = makeEdges(model, worldPlane)
    let planeSeen: THREE.Plane | null = null
    const original = vi.fn(async function (this: ClipEdgesInternals) { planeSeen = this.plane.clone() })

    await withModelPlacement(original).call(edges, 'm', 'Black')

    const onWorldPlane = new THREE.Vector3(3, 5, 7)
    const local = onWorldPlane.clone().applyMatrix4(model.object.matrixWorld.clone().invert())
    expect(planeSeen!.distanceToPoint(local)).toBeCloseTo(0)
    expect(edges.plane).toBe(worldPlane)
  })

  it('places the cut like the model, without compounding on later updates', async () => {
    const model = placedModel()
    const { edges, fills } = makeEdges(model, new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
    const update = withModelPlacement(async () => {})

    await update.call(edges, 'm', 'Black')
    await update.call(edges, 'm', 'Black')

    fills.updateMatrixWorld(true)
    const expected = new THREE.Vector3(0, 0, 1).applyMatrix4(model.object.matrixWorld)
    expect(new THREE.Vector3().setFromMatrixPosition(fills.matrixWorld).distanceTo(expected)).toBeCloseTo(0)
  })

  it('leaves a model it cannot find to the original', async () => {
    const worldPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 2)
    const { edges, fills } = makeEdges(undefined, worldPlane)
    const original = vi.fn(async () => {})

    await withModelPlacement(original).call(edges, 'm', 'Black')

    expect(original).toHaveBeenCalledOnce()
    expect(fills.position.toArray()).toEqual([0, 0, 1])
  })
})
