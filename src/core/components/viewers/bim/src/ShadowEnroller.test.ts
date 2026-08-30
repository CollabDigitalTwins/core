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
  class FragmentsManager { static uuid = 'fragments-manager-stub' }
  return { Component, Components, Event, FragmentsManager }
})

import { CurrentWorld } from './CurrentWorld'
import { ShadowEnroller } from './ShadowEnroller'

class StubEvent<T> {
  private handlers = new Set<(arg: T) => void>()
  add(handler: (arg: T) => void) { this.handlers.add(handler) }
  remove(handler: (arg: T) => void) { this.handlers.delete(handler) }
  trigger(arg: T) { for (const handler of [...this.handlers]) handler(arg) }
}

class StubMap<K, V> extends Map<K, V> {
  onItemSet = new StubEvent<{ key: K; value: V }>()

  add(key: K, value: V) {
    this.set(key, value)
    this.onItemSet.trigger({ key, value })
  }
}

function stubModel(tileCount: number) {
  const tiles = new StubMap<string, THREE.Object3D>()
  for (let i = 0; i < tileCount; i++) tiles.set(`tile-${i}`, new THREE.Mesh())
  return { tiles }
}

function setup() {
  const components = new OBC.Components()
  const models = new StubMap<string, ReturnType<typeof stubModel>>()
  components.add('fragments-manager-stub', { list: models } as unknown as OBC.Component)

  const renderer = { needsUpdate: false }
  components.get(CurrentWorld).world = { renderer } as unknown as OBC.World

  return { components, models, renderer }
}

describe('ShadowEnroller', () => {
  it('enrols the tiles of a model that was already loaded', () => {
    const { components, models } = setup()
    const model = stubModel(2)
    models.set('a', model)

    components.get(ShadowEnroller)

    for (const [, tile] of model.tiles) {
      expect(tile.castShadow).toBe(true)
      expect(tile.receiveShadow).toBe(true)
    }
  })

  it('enrols models that load after it is constructed', () => {
    const { components, models } = setup()
    components.get(ShadowEnroller)

    const model = stubModel(1)
    models.add('a', model)

    expect([...model.tiles.values()][0].castShadow).toBe(true)
  })

  it('enrols tiles that stream in later, which is how fragments delivers most geometry', () => {
    const { components, models } = setup()
    components.get(ShadowEnroller)
    const model = stubModel(0)
    models.add('a', model)

    const streamed = new THREE.Mesh()
    model.tiles.add('late', streamed)

    expect(streamed.castShadow).toBe(true)
  })

  it('asks the on-demand renderer to repaint once geometry is enrolled', () => {
    const { components, models, renderer } = setup()
    components.get(ShadowEnroller)
    renderer.needsUpdate = false

    models.add('a', stubModel(1))

    expect(renderer.needsUpdate).toBe(true)
  })

  it('excludeFromShadows clears the flags across a whole helper subtree', () => {
    const { components } = setup()
    const enroller = components.get(ShadowEnroller)

    const root = new THREE.Group()
    const child = new THREE.Mesh()
    child.castShadow = true
    child.receiveShadow = true
    root.add(child)

    enroller.excludeFromShadows(root)

    expect(child.castShadow).toBe(false)
    expect(child.receiveShadow).toBe(false)
  })

  it('stops listening once disposed', () => {
    const { components, models } = setup()
    const enroller = components.get(ShadowEnroller)
    enroller.dispose()

    const model = stubModel(1)
    models.add('a', model)

    expect([...model.tiles.values()][0].castShadow).toBe(false)
  })
})
