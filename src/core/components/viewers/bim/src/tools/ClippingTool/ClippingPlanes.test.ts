// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
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
  return {
    Component,
    Components,
    Event,
    Clipper: class { static uuid = 'clipper' },
    Raycasters: class { static uuid = 'raycasters' },
    ItemsFinder: class { static uuid = 'items-finder' },
    Classifier: class { static uuid = 'classifier' },
  }
})

vi.mock('@thatopen/components-front', () => ({ ClipStyler: class { static uuid = 'clip-styler' } }))

import { CurrentWorld } from '../../CurrentWorld'

import { ClippingPlanes } from './ClippingPlanes'

interface FakePlane {
  id: string
  size: number
  helper: THREE.Object3D
  meshes: THREE.Mesh[]
  update: () => void
}

function fakePlane(id: string, point: THREE.Vector3): FakePlane {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1))
  const helper = new THREE.Object3D()
  helper.position.copy(point)
  helper.add(mesh)
  return { id, size: 0, helper, meshes: [mesh], update: () => { } }
}

function fakeClipper() {
  let seq = 0
  return {
    enabled: false,
    size: 0,
    onBeforeDrag: new OBC.Event<FakePlane>(),
    onAfterDrag: new OBC.Event<FakePlane>(),
    list: new Map<string, FakePlane>(),
    createFromNormalAndCoplanarPoint(_world: unknown, _normal: THREE.Vector3, point: THREE.Vector3) {
      const id = `plane-id-${seq++}`
      this.list.set(id, fakePlane(id, point))
      return id
    },
  }
}

function fakeStyler() {
  return {
    world: null as unknown,
    styles: new Map<string, unknown>(),
    createFromClipping: () => ({ update: async () => { }, dispose: () => { } }),
  }
}

function setUp() {
  const clipper = fakeClipper()
  const styler = fakeStyler()
  const hits: { ray: unknown; objects: { object: THREE.Object3D } | null } = { ray: null, objects: null }
  const castRayToObjects = vi.fn(() => hits.objects)
  const caster = { castRay: async () => hits.ray, castRayToObjects }

  const components = new OBC.Components()
  components.add('clipper', clipper as never)
  components.add('clip-styler', styler as never)
  components.add('raycasters', { get: () => caster } as never)
  components.add('items-finder', { create: () => undefined } as never)
  components.add('classifier', { setGroupQuery: () => undefined } as never)

  const camera = new THREE.PerspectiveCamera()
  camera.position.set(0, 0, 10)
  const world = { scene: { three: new THREE.Scene() }, camera: { three: camera }, renderer: {} }
  components.get(CurrentWorld).world = world as never

  const planes = components.get(ClippingPlanes)
  planes.setup()

  const addPlaneAt = async (point: THREE.Vector3) => {
    hits.ray = { point, normal: new THREE.Vector3(0, 0, 1) }
    await planes.createAtCursor()
    hits.ray = null
  }

  const aimAt = (key: string) => {
    const plane = clipper.list.get(idOf(key, clipper))
    hits.objects = plane ? { object: plane.meshes[0] } : null
  }

  const aimAtNothing = () => { hits.objects = null }

  return { clipper, components, planes, addPlaneAt, aimAt, aimAtNothing, castRayToObjects }
}

/** Fake planes are handed out in key order, so the nth record owns the nth clipper id. */
function idOf(key: string, clipper: ReturnType<typeof fakeClipper>): string {
  const index = Number(key.split('-')[1])
  return [...clipper.list.keys()][index] ?? ''
}

describe('ClippingPlanes plane list', () => {
  it('lists nothing before a plane is created', () => {
    const { planes } = setUp()

    expect(planes.planes).toEqual([])
  })

  it('reports the key, normal and point of every plane', async () => {
    const { planes, addPlaneAt } = setUp()

    await addPlaneAt(new THREE.Vector3(1, 2, 3))

    expect(planes.planes).toHaveLength(1)
    const [first] = planes.planes
    expect(first.key).toBe('plane-0')
    expect(first.point.toArray()).toEqual([1, 2, 3])
    expect(first.normal.equals(new THREE.Vector3(0, 0, -1))).toBe(true)
  })

  it('hands back copies, so a caller cannot move a plane behind its back', async () => {
    const { planes, addPlaneAt } = setUp()
    await addPlaneAt(new THREE.Vector3(1, 2, 3))

    const [first] = planes.planes
    first.point.setScalar(999)
    first.normal.setScalar(999)

    expect(planes.planes[0].point.toArray()).toEqual([1, 2, 3])
    expect(planes.planes[0].normal.equals(new THREE.Vector3(0, 0, -1))).toBe(true)
  })
})

describe('ClippingPlanes.onChanged', () => {
  it('announces a plane being added', async () => {
    const { planes, addPlaneAt } = setUp()
    const changed = vi.fn()
    planes.onChanged.add(changed)

    await addPlaneAt(new THREE.Vector3(0, 0, 0))

    expect(changed).toHaveBeenCalledTimes(1)
    expect(changed.mock.calls[0][0]).toHaveLength(1)
  })

  it('announces a plane being deleted at the cursor', async () => {
    const { planes, addPlaneAt, aimAt } = setUp()
    await addPlaneAt(new THREE.Vector3(0, 0, 0))
    const changed = vi.fn()
    planes.onChanged.add(changed)

    aimAt('plane-0')
    planes.deleteAtCursor()

    expect(changed).toHaveBeenCalledTimes(1)
    expect(changed.mock.calls[0][0]).toEqual([])
  })

  it('announces a delete-all', async () => {
    const { planes, addPlaneAt } = setUp()
    await addPlaneAt(new THREE.Vector3(0, 0, 0))
    await addPlaneAt(new THREE.Vector3(1, 0, 0))
    const changed = vi.fn()
    planes.onChanged.add(changed)

    planes.deleteAll()

    expect(changed).toHaveBeenCalled()
    expect(planes.planes).toEqual([])
    expect(changed.mock.calls.at(-1)?.[0]).toEqual([])
  })

  it('announces an undo and a redo', async () => {
    const { planes, addPlaneAt } = setUp()
    await addPlaneAt(new THREE.Vector3(0, 0, 0))
    const changed = vi.fn()
    planes.onChanged.add(changed)

    await planes.undo()
    expect(changed.mock.calls.at(-1)?.[0]).toEqual([])

    await planes.redo()
    expect(changed.mock.calls.at(-1)?.[0]).toHaveLength(1)
  })

  it('announces a plane the user has dragged, at its new point', async () => {
    const { planes, addPlaneAt, clipper } = setUp()
    await addPlaneAt(new THREE.Vector3(0, 0, 0))
    const changed = vi.fn()
    planes.onChanged.add(changed)

    const plane = [...clipper.list.values()][0]
    clipper.onBeforeDrag.trigger(plane)
    plane.helper.position.set(0, 0, 4)
    clipper.onAfterDrag.trigger(plane)

    expect(changed).toHaveBeenCalledTimes(1)
    expect(planes.planes[0].point.toArray()).toEqual([0, 0, 4])
  })

  it('stays quiet when a drag moved nothing', async () => {
    const { planes, addPlaneAt, clipper } = setUp()
    await addPlaneAt(new THREE.Vector3(0, 0, 0))
    const changed = vi.fn()
    planes.onChanged.add(changed)

    const plane = [...clipper.list.values()][0]
    clipper.onBeforeDrag.trigger(plane)
    clipper.onAfterDrag.trigger(plane)

    expect(changed).not.toHaveBeenCalled()
  })
})

describe('ClippingPlanes.planeAtCursor', () => {
  it('finds nothing when there is no plane at all', () => {
    const { planes, castRayToObjects } = setUp()

    expect(planes.planeAtCursor()).toBeNull()
    expect(castRayToObjects).not.toHaveBeenCalled()
  })

  it('finds nothing when the cursor is off every plane', async () => {
    const { planes, addPlaneAt, aimAtNothing } = setUp()
    await addPlaneAt(new THREE.Vector3(0, 0, 0))

    aimAtNothing()

    expect(planes.planeAtCursor()).toBeNull()
  })

  it('finds the plane under the cursor', async () => {
    const { planes, addPlaneAt, aimAt } = setUp()
    await addPlaneAt(new THREE.Vector3(0, 0, 0))
    await addPlaneAt(new THREE.Vector3(5, 0, 0))

    aimAt('plane-1')

    expect(planes.planeAtCursor()?.key).toBe('plane-1')
    expect(planes.planeAtCursor()?.point.toArray()).toEqual([5, 0, 0])
  })
})

describe('ClippingPlanes.deleteAtCursor', () => {
  it('removes only the plane under the cursor', async () => {
    const { planes, addPlaneAt, aimAt, clipper } = setUp()
    await addPlaneAt(new THREE.Vector3(0, 0, 0))
    await addPlaneAt(new THREE.Vector3(5, 0, 0))

    aimAt('plane-0')
    planes.deleteAtCursor()

    expect(planes.planes.map(plane => plane.key)).toEqual(['plane-1'])
    expect(clipper.list.size).toBe(1)
  })

  it('does nothing when the cursor is over no plane', async () => {
    const { planes, addPlaneAt, aimAtNothing } = setUp()
    await addPlaneAt(new THREE.Vector3(0, 0, 0))
    const depth = planes.history.depth

    aimAtNothing()
    planes.deleteAtCursor()

    expect(planes.planes).toHaveLength(1)
    expect(planes.history.depth).toBe(depth)
  })

  it('does not raycast when there are no planes', () => {
    const { planes, castRayToObjects } = setUp()

    planes.deleteAtCursor()

    expect(castRayToObjects).not.toHaveBeenCalled()
  })

  it('brings the plane back on undo, at the same key and point', async () => {
    const { planes, addPlaneAt, aimAt } = setUp()
    await addPlaneAt(new THREE.Vector3(2, 0, 0))

    aimAt('plane-0')
    planes.deleteAtCursor()
    await planes.undo()

    expect(planes.planes.map(plane => plane.key)).toEqual(['plane-0'])
    expect(planes.planes[0].point.toArray()).toEqual([2, 0, 0])
  })
})
