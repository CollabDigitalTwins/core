// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { DEFAULT_PLACEMENT } from './pointCloudPlacement'
import { PointCloudRegistry } from './pointCloudRegistry'

import type { PointCloudSource } from './pointCloudSource'

function stubSource(): PointCloudSource {
  return { resolve: async (id) => ({ fileName: 'metadata.json', baseUrl: `https://pc/${id}/`, name: `cloud-${id}` }) }
}

const loadCalls: string[] = []

function stubEngine() {
  const disposed: string[] = []
  return {
    disposed,
    pointBudget: 1_000_000,
    load: async (fileName: string, baseUrl: string) => {
      loadCalls.push(`${baseUrl}${fileName}`)
      const octree = new THREE.Object3D() as THREE.Object3D & { dispose: () => void }
      octree.name = `octree:${baseUrl}${fileName}`
      octree.dispose = () => { disposed.push(octree.name) }
      return octree
    },
    update: () => ({ numVisiblePoints: 0, streaming: false }),
    pick: () => null,
    dispose: () => {},
  }
}

function makeRegistry() {
  loadCalls.length = 0
  const scene = new THREE.Scene()
  const engine = stubEngine()
  const registry = new PointCloudRegistry({ scene, engine, source: stubSource() })
  return { scene, engine, registry }
}

describe('PointCloudRegistry', () => {
  it('adds a loaded cloud into the scene', async () => {
    const { scene, registry } = makeRegistry()

    await registry.add('669')

    expect(registry.list().map((c) => c.id)).toEqual(['669'])
    expect(scene.getObjectByName('pointcloud:669')).toBeDefined()
  })

  it('does not load the same cloud twice', async () => {
    const { registry } = makeRegistry()

    await registry.add('669')
    await registry.add('669')

    expect(registry.list()).toHaveLength(1)
    expect(loadCalls).toHaveLength(1)
  })

  it('orients a Z-up cloud onto world up', async () => {
    const { registry } = makeRegistry()

    const cloud = await registry.add('669')
    const up = cloud.octree.localToWorld(new THREE.Vector3(0, 0, 1))

    expect([up.x, up.y, up.z].map((n) => Math.round(n * 1e6) / 1e6)).toEqual([0, 1, 0])
  })

  it('applies a stored placement when adding', async () => {
    const { registry } = makeRegistry()

    const cloud = await registry.add('669', { ...DEFAULT_PLACEMENT, position: [5, 6, 7] })

    expect(cloud.root.position.toArray()).toEqual([5, 6, 7])
  })

  it('moves a cloud when its placement changes', async () => {
    const { registry } = makeRegistry()
    await registry.add('669')

    registry.setPlacement('669', { ...DEFAULT_PLACEMENT, position: [1, 2, 3], scale: 2 })

    const cloud = registry.list()[0]
    expect(cloud.root.position.toArray()).toEqual([1, 2, 3])
    expect(cloud.root.scale.x).toBe(2)
    expect(cloud.placement.scale).toBe(2)
  })

  it('removes a cloud from the scene and disposes its octree', async () => {
    const { scene, engine, registry } = makeRegistry()
    await registry.add('669')

    registry.remove('669')

    expect(registry.list()).toEqual([])
    expect(scene.getObjectByName('pointcloud:669')).toBeUndefined()
    expect(engine.disposed).toHaveLength(1)
  })

  it('ignores removal of a cloud that was never added', async () => {
    const { registry } = makeRegistry()
    expect(() => registry.remove('nope')).not.toThrow()
  })

  it('drops every cloud on dispose', async () => {
    const { scene, registry } = makeRegistry()
    await registry.add('669')
    await registry.add('670')

    registry.dispose()

    expect(registry.list()).toEqual([])
    expect(scene.children).toHaveLength(0)
  })

  it('collapses concurrent requests for the same cloud into one load', async () => {
    const { registry } = makeRegistry()

    await Promise.all([registry.add('669'), registry.add('669'), registry.add('669')])

    expect(registry.list()).toHaveLength(1)
    expect(loadCalls).toHaveLength(1)
  })
})
