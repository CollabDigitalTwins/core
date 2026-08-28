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
  return { Component, Components, Event }
})

const { styler } = vi.hoisted(() => ({
  styler: {
    world: null as unknown,
    styles: new Map<string, unknown>(),
    cuts: [] as { plane: unknown; style: unknown; updates: number; disposed: boolean; visible: boolean }[],
    create(plane: unknown, config: { items: { All: { style: unknown } } }) {
      const cut = {
        plane,
        style: config.items.All.style,
        updates: 0,
        disposed: false,
        visible: false,
        update: async () => { cut.updates++ },
        dispose: () => { cut.disposed = true },
      }
      styler.cuts.push(cut)
      return cut
    },
  },
}))

vi.mock('@thatopen/components-front', () => ({ ClipStyler: class { static uuid = 'clip-styler' } }))

import { CurrentWorld } from '../../CurrentWorld'

import { boxClipPlanes, MIN_CLIP_BOX_SIZE } from './clipBox'
import { ClippingBoxes } from './ClippingBoxes'

function fakeRenderer() {
  const clippingPlanes: THREE.Plane[] = []
  return {
    clippingPlanes,
    updates: 0,
    three: { domElement: document.createElement('canvas'), clippingPlanes: [] as THREE.Plane[] },
    setPlane(active: boolean, plane: THREE.Plane) {
      const at = clippingPlanes.indexOf(plane)
      if (active && at === -1) clippingPlanes.push(plane)
      if (!active && at > -1) clippingPlanes.splice(at, 1)
    },
    updateClippingPlanes() { this.updates++ },
  }
}

function setUp() {
  styler.styles.clear()
  styler.cuts.length = 0

  const components = new OBC.Components()
  components.add('clip-styler', styler as never)
  const scene = new THREE.Scene()
  const model = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10))
  model.name = 'model'
  scene.add(model)

  const renderer = fakeRenderer()
  const world = { scene: { three: scene }, camera: { three: new THREE.PerspectiveCamera() }, renderer }
  components.get(CurrentWorld).world = world as never

  return { components, boxes: components.get(ClippingBoxes), scene, renderer, world }
}

const helperOf = (scene: THREE.Scene) => scene.getObjectByName('clip-box-helper')

describe('ClippingBoxes', () => {
  it('starts inactive and cuts nothing', () => {
    const { boxes, renderer } = setUp()

    expect(boxes.active).toBe(false)
    expect(boxes.bounds).toBeNull()
    expect(renderer.clippingPlanes).toEqual([])
  })

  it('adds six planes to the renderer when switched on', () => {
    const { boxes, renderer } = setUp()

    boxes.toggle()

    expect(boxes.active).toBe(true)
    expect(renderer.clippingPlanes).toHaveLength(6)
    expect(renderer.updates).toBeGreaterThan(0)
  })

  it('fits around the model with room to spare', () => {
    const { boxes } = setUp()

    boxes.fitToScene()

    expect(boxes.bounds?.containsBox(new THREE.Box3(
      new THREE.Vector3(-5, -5, -5),
      new THREE.Vector3(5, 5, 5),
    ))).toBe(true)
  })

  it('leaves the planes of other tools alone', () => {
    const { boxes, renderer } = setUp()
    const foreign = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    renderer.setPlane(true, foreign)

    boxes.toggle()
    boxes.clear()

    expect(renderer.clippingPlanes).toEqual([foreign])
  })

  it('replaces its planes rather than stacking them as the box is resized', () => {
    const { boxes, renderer } = setUp()
    boxes.toggle()

    boxes.dragFaceTo('x+', new THREE.Vector3(2, 0, 0))
    boxes.dragFaceTo('x+', new THREE.Vector3(1, 0, 0))

    expect(renderer.clippingPlanes).toHaveLength(6)
    expect(boxes.bounds?.max.x).toBe(1)
  })

  it('cuts at the box it reports', () => {
    const { boxes, renderer } = setUp()
    boxes.setBounds(new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)))

    for (const plane of renderer.clippingPlanes) {
      expect(plane.distanceToPoint(new THREE.Vector3(0, 0, 0))).toBeGreaterThan(0)
      expect(plane.distanceToPoint(new THREE.Vector3(9, 9, 9))).not.toBeNaN()
    }
    expect(renderer.clippingPlanes.some((p) => p.distanceToPoint(new THREE.Vector3(9, 0, 0)) < 0)).toBe(true)
  })

  it('never crushes the box past its minimum thickness', () => {
    const { boxes } = setUp()
    boxes.setBounds(new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(4, 4, 4)))

    boxes.dragFaceTo('y+', new THREE.Vector3(0, -99, 0))

    expect(boxes.bounds?.max.y).toBeCloseTo(MIN_CLIP_BOX_SIZE)
  })

  it('ignores a drag while it is switched off', () => {
    const { boxes, renderer } = setUp()

    boxes.dragFaceTo('x+', new THREE.Vector3(1, 0, 0))

    expect(boxes.active).toBe(false)
    expect(renderer.clippingPlanes).toEqual([])
  })

  it('shows a helper while active and takes it away on clear', () => {
    const { boxes, scene } = setUp()

    boxes.toggle()
    expect(helperOf(scene)).toBeDefined()

    boxes.toggle()
    expect(boxes.active).toBe(false)
    expect(helperOf(scene)).toBeUndefined()
  })

  it('keeps the helper out of its own fit, so repeated fits do not grow the box', () => {
    const { boxes } = setUp()

    boxes.fitToScene()
    const first = boxes.bounds
    boxes.fitToScene()

    expect(boxes.bounds?.max.toArray()).toEqual(first?.max.toArray())
  })

  it('draws the helper inside the cut so the box does not erase itself', () => {
    const { boxes, scene } = setUp()
    boxes.setBounds(new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5)))
    const planes = boxClipPlanes(boxes.bounds as THREE.Box3)

    const helper = helperOf(scene) as THREE.Object3D
    helper.updateMatrixWorld(true)

    for (const child of helper.children) {
      const centre = child.getWorldPosition(new THREE.Vector3())
      for (const plane of planes) expect(plane.distanceToPoint(centre)).toBeGreaterThan(0)
    }
  })

  it('announces the box it settled on, and its removal', () => {
    const { boxes } = setUp()
    const changed = vi.fn()
    boxes.onChanged.add(changed)

    boxes.toggle()
    boxes.clear()

    expect(changed).toHaveBeenCalledTimes(2)
    expect(changed.mock.calls[0][0]).toBeInstanceOf(THREE.Box3)
    expect(changed.mock.calls[1][0]).toBeNull()
  })

  it('hands back a copy of its bounds, so a caller cannot move the cut behind its back', () => {
    const { boxes, renderer } = setUp()
    boxes.toggle()

    const bounds = boxes.bounds as THREE.Box3
    bounds.max.setScalar(999)

    expect(boxes.bounds?.max.x).not.toBe(999)
    expect(renderer.clippingPlanes).toHaveLength(6)
  })

  it('clears the cut and the helper on dispose', () => {
    const { boxes, scene, renderer } = setUp()
    boxes.setup()
    boxes.toggle()
    const disposed = vi.fn()
    boxes.onDisposed.add(disposed)

    boxes.dispose()

    expect(renderer.clippingPlanes).toEqual([])
    expect(helperOf(scene)).toBeUndefined()
    expect(disposed).toHaveBeenCalledTimes(1)
  })

  it('survives a dispose with no world configured', () => {
    const components = new OBC.Components()
    const boxes = components.get(ClippingBoxes)

    expect(() => boxes.dispose()).not.toThrow()
  })
})

describe('ClippingBoxes cut styling', () => {
  it('caps the cut in black, the same style the section planes use', () => {
    const { boxes } = setUp()

    boxes.toggle()

    expect(styler.cuts).toHaveLength(6)
    expect(styler.cuts.every((cut) => cut.style === 'Black')).toBe(true)
    expect(styler.styles.has('Black')).toBe(true)
  })

  it('registers the style itself rather than relying on the plane tool having run', () => {
    const { boxes } = setUp()
    expect(styler.styles.has('Black')).toBe(false)

    boxes.toggle()

    expect(styler.styles.get('Black')).toBeDefined()
  })

  it('shows the cap, which ClipEdges do not do on their own', () => {
    const { boxes } = setUp()

    boxes.toggle()

    expect(styler.cuts.every((cut) => cut.visible)).toBe(true)
  })

  it('gives the styler the world, otherwise showing the cap is a no-op', () => {
    const { boxes, world } = setUp()

    boxes.toggle()

    expect(styler.world).toBe(world)
  })

  it('refreshes the cap as a face is dragged, without rebuilding it', () => {
    const { boxes } = setUp()
    boxes.toggle()
    const before = styler.cuts.length

    boxes.dragFaceTo('x+', new THREE.Vector3(2, 0, 0))

    expect(styler.cuts).toHaveLength(before)
    expect(styler.cuts.every((cut) => cut.updates > 0)).toBe(true)
  })

  it('keeps the planes it handed the styler, so the cap follows the box', () => {
    const { boxes, renderer } = setUp()
    boxes.toggle()
    const registered = [...renderer.clippingPlanes]

    boxes.dragFaceTo('x+', new THREE.Vector3(2, 0, 0))

    expect(renderer.clippingPlanes).toEqual(registered)
    expect(styler.cuts.map((cut) => cut.plane)).toEqual(registered)
  })

  it('disposes the cap when the box goes away', () => {
    const { boxes } = setUp()
    boxes.toggle()

    boxes.clear()

    expect(styler.cuts.every((cut) => cut.disposed)).toBe(true)
  })
})
