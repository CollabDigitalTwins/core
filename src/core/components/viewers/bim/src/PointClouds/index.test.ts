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

import { CLIP_MODE_DISABLED, CLIP_MODE_OUTSIDE } from './pointCloudClipping'

import { BimPointClouds } from './index'

import type { LoadedPointCloud, PointCloudEngine } from '../../../shared/pointcloud/pointCloudRegistry'
import type { PointCloudSource } from '../../../shared/pointcloud/pointCloudSource'

function stubMaterial() {
  return {
    clippingPlanes: [] as readonly THREE.Plane[],
    clipMode: 0,
    size: 0,
    minSize: 0,
    maxSize: 0,
    pointSizeType: 0,
    pointColorType: 9,
    shape: 0,
    inputColorEncoding: 1,
    outputColorEncoding: 0,
    opacity: 1,
    transparent: false,
    blending: 0,
    depthTest: true,
    needsUpdate: false,
    syncClippingPlanes: () => {},
    updateShaderSource: () => {},
  }
}

function stubEngine() {
  const loaded: string[] = []
  let disposed = 0
  const engine: PointCloudEngine & {
    loaded: string[]
    disposedCount: () => number
    updates: number
    streaming: boolean
  } = {
    pointBudget: 1_000,
    loaded,
    updates: 0,
    streaming: false,
    disposedCount: () => disposed,
    load: async (fileName) => {
      loaded.push(fileName)
      const octree = new THREE.Object3D()
      return Object.assign(octree, { dispose: vi.fn(), material: stubMaterial() })
    },
    update: () => {
      engine.updates++
      return { numVisiblePoints: 7, streaming: engine.streaming }
    },
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

function handlersOf(event: unknown) {
  return (event as { handlers: Set<unknown> }).handlers
}

function materialOf(cloud: LoadedPointCloud | null) {
  return (cloud as unknown as { octree: { material: ReturnType<typeof stubMaterial> } }).octree.material
}

function setUp(requestFrame: (callback: () => void) => number = () => 0) {
  const components = new OBC.Components()
  const clouds = components.get(BimPointClouds)
  const world = fakeWorld()
  const engine = stubEngine()
  clouds.setup({
    world: world as never,
    source: stubSource(),
    engine,
    requestFrame,
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

  it('gives a cloud the planes already on the renderer when it loads', async () => {
    const { clouds, world } = setUp()
    world.renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 2)]

    const cloud = await clouds.add('669')

    expect(materialOf(cloud)).toMatchObject({ clipMode: CLIP_MODE_OUTSIDE })
    expect(materialOf(cloud).clippingPlanes).toHaveLength(1)
  })

  it('re-syncs every cloud when the renderer announces new planes', async () => {
    const { clouds, world } = setUp()
    const cloud = await clouds.add('669')

    world.renderer.clippingPlanes = [new THREE.Plane(), new THREE.Plane()]
    world.renderer.onClippingPlanesUpdated.trigger()

    expect(materialOf(cloud).clippingPlanes).toHaveLength(2)
  })

  it('drops clipping back to disabled when the last plane goes', async () => {
    const { clouds, world } = setUp()
    world.renderer.clippingPlanes = [new THREE.Plane()]
    const cloud = await clouds.add('669')
    expect(materialOf(cloud).clipMode).toBe(CLIP_MODE_OUTSIDE)

    world.renderer.clippingPlanes = []
    world.renderer.onClippingPlanesUpdated.trigger()

    expect(materialOf(cloud).clipMode).toBe(CLIP_MODE_DISABLED)
  })

  it('leaves no plane listener on the renderer once disposed', async () => {
    const { clouds, world } = setUp()
    await clouds.add('669')
    expect(handlersOf(world.renderer.onClippingPlanesUpdated).size).toBe(1)

    clouds.dispose()

    expect(handlersOf(world.renderer.onClippingPlanesUpdated).size).toBe(0)
  })

  it('updates the octree on every rendered frame, not only the first', async () => {
    const { clouds, world, engine } = setUp()
    await clouds.add('669')
    const before = engine.updates

    world.renderer.onBeforeUpdate.trigger()
    world.renderer.onBeforeUpdate.trigger()
    world.renderer.onBeforeUpdate.trigger()

    expect(engine.updates - before).toBe(3)
  })

  it('keeps drawing while the engine reports it is still streaming', async () => {
    const frames: Array<() => void> = []
    const { clouds, world, engine } = setUp((callback) => { frames.push(callback); return frames.length })
    await clouds.add('669')
    engine.streaming = true
    world.renderer.onBeforeUpdate.trigger()

    world.renderer.needsUpdate = false
    frames.pop()?.()

    expect(world.renderer.needsUpdate).toBe(true)
  })

  it('gives a newly loaded cloud the appearance already in force', async () => {
    const { clouds } = setUp()
    clouds.setAppearance({ shape: 'square', size: 3 })

    const cloud = await clouds.add('669')

    expect(materialOf(cloud).shape).toBe(0)
    expect(materialOf(cloud).size).toBe(3)
  })

  it('repaints every loaded cloud when the appearance changes', async () => {
    const { clouds, engine } = setUp()
    const cloud = await clouds.add('669')

    clouds.setAppearance({ sizeType: 'fixed', pointBudget: 2_000_000 })

    expect(materialOf(cloud).pointSizeType).toBe(0)
    expect(engine.pointBudget).toBe(2_000_000)
  })

  it('clamps an appearance the shader could not render', async () => {
    const { clouds } = setUp()

    clouds.setAppearance({ pointBudget: 1e12, shape: 'blob' as never })

    expect(clouds.appearance.pointBudget).toBe(20_000_000)
    expect(clouds.appearance.shape).toBe('circle')
  })

  it('re-asserts blending every frame, since any shader rebuild reverts it', async () => {
    const { clouds, world } = setUp()
    clouds.setAppearance({ opacity: 0.4 })
    const cloud = await clouds.add('669')
    materialOf(cloud).blending = 2
    materialOf(cloud).depthTest = false

    world.renderer.onBeforeUpdate.trigger()

    expect(materialOf(cloud).blending).toBe(THREE.NormalBlending)
    expect(materialOf(cloud).depthTest).toBe(true)
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
