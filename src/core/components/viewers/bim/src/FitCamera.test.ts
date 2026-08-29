// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@thatopen/components', () => {
  class Component { constructor(public components: unknown) { } }
  class Components {
    private instances = new Map<string, unknown>()
    add(uuid: string, instance: unknown) { this.instances.set(uuid, instance) }
    get(Ctor: { uuid?: string }): never { return this.instances.get(String(Ctor.uuid)) as never }
  }
  return { Component, Components, BoundingBoxer: { uuid: 'boxer' }, FragmentsManager: { uuid: 'frags' } }
})

vi.mock('./CurrentWorld', () => ({ CurrentWorld: { uuid: 'world' } }))

import { FitCamera } from './FitCamera'

function setUp(selectionBox: THREE.Box3 | null) {
  const fitted: THREE.Sphere[] = []
  const rotated: THREE.Box3[] = []
  const controls = {
    fitToSphere: (sphere: THREE.Sphere) => { fitted.push(sphere.clone()); return Promise.resolve() },
    fitToBox: (box: THREE.Box3) => { rotated.push(box.clone()); return Promise.resolve() },
  }
  const world = { camera: { controls }, meshes: new Set(), scene: { three: new THREE.Scene() } }

  const boxer = {
    added: [] as unknown[],
    list: { clear: () => {} },
    addFromModelIdMap: async (items: unknown) => { boxer.added.push(items) },
    get: () => selectionBox ?? new THREE.Box3(),
  }

  const components = new OBC.Components() as unknown as { add: (uuid: string, value: unknown) => void }
  components.add('world', { world })
  components.add('boxer', boxer)
  components.add('frags', { groups: new Map([['a', { boundingBox: new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5)) }]]) })
  components.add(FitCamera.uuid, null)

  return { camera: new FitCamera(components as never), fitted, rotated, boxer }
}

const SELECTION = { 'model-a': new Set([1, 2]) }

describe('FitCamera.fitToItems', () => {
  it('frames just the selected items', async () => {
    const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1))
    const { camera, fitted, boxer } = setUp(box)

    const framed = await camera.fitToItems(SELECTION as never)

    expect(framed).toBe(true)
    expect(boxer.added).toEqual([SELECTION])
    expect(fitted[0].center.toArray()).toEqual([0.5, 0.5, 0.5])
  })

  it('reports back when the selection has no geometry, so the caller can fall back', async () => {
    const { camera, fitted } = setUp(null)

    const framed = await camera.fitToItems(SELECTION as never)

    expect(framed).toBe(false)
    expect(fitted).toHaveLength(0)
  })

  it('frames the whole model when nothing is selected', async () => {
    const { camera, fitted } = setUp(null)

    await camera.fit()

    expect(fitted[0].center.toArray()).toEqual([0, 0, 0])
  })

  it('never turns the camera — fitToBox would snap it to the nearest axis', async () => {
    const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1))
    const { camera, rotated } = setUp(box)

    await camera.fitToItems(SELECTION as never)
    await camera.fit()

    expect(rotated).toHaveLength(0)
  })
})
