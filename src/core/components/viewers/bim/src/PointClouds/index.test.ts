// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@thatopen/components', () => {
  class Event<T> {
    handlers = new Set<(arg: T) => void>()
    add(handler: (arg: T) => void) { this.handlers.add(handler) }
    remove(handler: (arg: T) => void) { this.handlers.delete(handler) }
    trigger(arg?: T) { for (const handler of [...this.handlers]) handler(arg as T) }
    reset() { this.handlers.clear() }
  }
  class Component {
    constructor(public components: unknown) { }
  }
  class Components {
    private instances = new Map<string, unknown>()
    add(uuid: string, instance: unknown) { this.instances.set(uuid, instance) }
    get<T>(Ctor: { uuid: string; new(components: Components): T }): T {
      const existing = this.instances.get(Ctor.uuid)
      return (existing as T) ?? new Ctor(this)
    }
  }
  return { Component, Components, Event }
})

import { pointCloudRootName } from '../../../shared/pointcloud/pointCloudRegistry'

import { BimPointClouds } from './index'

import type { PointCloudEngine } from '../../../shared/pointcloud/pointCloudRegistry'
import type { PointCloudSource } from '../../../shared/pointcloud/pointCloudSource'

function stubEngine() {
  const loaded: string[] = []
  let disposed = 0
  const engine: PointCloudEngine & { loaded: string[]; disposedCount: () => number } = {
    pointBudget: 1_000,
    loaded,
    disposedCount: () => disposed,
    load: async (fileName) => {
      loaded.push(fileName)
      const octree = new THREE.Object3D()
      return Object.assign(octree, { dispose: vi.fn() })
    },
    update: () => ({ numVisiblePoints: 7, pendingGpuLoads: false }),
    dispose: () => { disposed++ },
  }
  return engine
}

function stubSource(): PointCloudSource {
  return { resolve: async (fileId) => ({ fileName: `${fileId}.json`, baseUrl: 'https://pc.test/', name: `cloud ${fileId}` }) }
}

function fakeWorld() {
  const scene = new THREE.Scene()
  const excludedObjects = new Set<unknown>()
  return {
    scene: { three: scene, distanceRenderer: { excludedObjects } },
    camera: { three: new THREE.PerspectiveCamera() },
    renderer: {
      three: { localClippingEnabled: false },
      needsUpdate: false,
      onBeforeUpdate: new OBC.Event<void>(),
      clippingPlanes: [],
      onClippingPlanesUpdated: new OBC.Event<void>(),
    },
  }
}

function setUp() {
  const components = new OBC.Components()
  const clouds = components.get(BimPointClouds)
  const world = fakeWorld()
  const engine = stubEngine()
  clouds.setup({
    world: world as never,
    source: stubSource(),
    engine,
    requestFrame: () => 0,
    cancelFrame: () => undefined,
  })
  return { components, clouds, world, engine }
}

describe('BimPointClouds', () => {
  it('adds a cloud to the world scene under its id-derived root', async () => {
    const { clouds, world } = setUp()

    await clouds.add('669')

    expect(world.scene.three.getObjectByName(pointCloudRootName('669'))).toBeDefined()
    expect(clouds.ids()).toEqual(['669'])
  })

  it('is idempotent and collapses concurrent adds of the same id', async () => {
    const { clouds, engine } = setUp()

    await Promise.all([clouds.add('669'), clouds.add('669')])
    await clouds.add('669')

    expect(engine.loaded).toEqual(['669.json'])
    expect(clouds.ids()).toEqual(['669'])
  })

  it('fires onChanged once per add and once per remove', async () => {
    const { clouds } = setUp()
    const changed = vi.fn()
    clouds.onChanged.add(changed)

    await clouds.add('669')
    expect(changed).toHaveBeenCalledTimes(1)

    clouds.remove('669')
    expect(changed).toHaveBeenCalledTimes(2)
    expect(clouds.ids()).toEqual([])
  })

  it('ignores removing an id it never loaded', async () => {
    const { clouds } = setUp()
    const changed = vi.fn()
    clouds.onChanged.add(changed)

    clouds.remove('nope')

    expect(changed).not.toHaveBeenCalled()
  })

  it('excludes cloud roots from the shadow distance renderer', async () => {
    const { clouds, world } = setUp()

    await clouds.add('669')

    expect(world.scene.distanceRenderer.excludedObjects.size).toBe(1)
  })

  it('empties the scene and disposes the engine on dispose', async () => {
    const { clouds, world, engine } = setUp()
    await clouds.add('669')

    clouds.dispose()

    expect(world.scene.three.getObjectByName(pointCloudRootName('669'))).toBeUndefined()
    expect(engine.disposedCount()).toBe(1)
    expect(clouds.ids()).toEqual([])
  })

  it('fires onDisposed and survives a dispose with no world configured', () => {
    const components = new OBC.Components()
    const clouds = components.get(BimPointClouds)
    const disposed = vi.fn()
    clouds.onDisposed.add(disposed)

    expect(() => clouds.dispose()).not.toThrow()
    expect(disposed).toHaveBeenCalledTimes(1)
  })

  it('drives the engine from the renderer frame hook', async () => {
    const { clouds, world } = setUp()
    await clouds.add('669')

    world.renderer.onBeforeUpdate.trigger()

    expect(clouds.visiblePoints).toBe(7)
  })
})
