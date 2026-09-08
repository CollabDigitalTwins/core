// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@thatopen/components', () => {
  class Event<T> {
    handlers = new Set<(arg: T) => void>()
    add(handler: (arg: T) => void) { this.handlers.add(handler) }
    remove(handler: (arg: T) => void) { this.handlers.delete(handler) }
    trigger(arg: T) { for (const handler of [...this.handlers]) handler(arg) }
  }
  class Component {
    constructor(public components: any) {}
  }
  return { Component, Event, Components: class Components {}, FragmentsManager: class {} }
})

const { ModelManager } = await import('./index')
type ModelManager = InstanceType<typeof ModelManager>

function stubModel() {
  const map = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({ map })
  const geometry = new THREE.BufferGeometry()
  vi.spyOn(map, 'dispose')
  vi.spyOn(material, 'dispose')
  vi.spyOn(geometry, 'dispose')

  const model = new THREE.Group()
  model.add(new THREE.Mesh(geometry, material))
  new THREE.Scene().add(model)

  return { model, geometry, material, map }
}

// The constructor needs a live OBC.Components; only the release path is under test.
function managerHolding(modelInfo: unknown) {
  const manager = Object.create(ModelManager.prototype) as ModelManager
  ;(manager as unknown as { _models: Map<string, unknown> })._models = new Map([['7', modelInfo]])
  return manager
}

describe('ModelManager.remove', () => {
  it('frees the geometry, material and textures rather than just detaching', () => {
    const { model, geometry, material, map } = stubModel()

    managerHolding({ id: '7', name: 'a.glb', model, clips: [] }).remove('7')

    expect(geometry.dispose).toHaveBeenCalled()
    expect(material.dispose).toHaveBeenCalled()
    expect(map.dispose).toHaveBeenCalled()
    expect(model.parent).toBeNull()
  })

  it('uncaches the mixer root, not just stopping the actions', () => {
    const { model } = stubModel()
    const mixer = new THREE.AnimationMixer(model)
    vi.spyOn(mixer, 'stopAllAction')
    vi.spyOn(mixer, 'uncacheRoot')

    managerHolding({ id: '7', name: 'a.glb', model, clips: [], mixer }).remove('7')

    expect(mixer.stopAllAction).toHaveBeenCalled()
    expect(mixer.uncacheRoot).toHaveBeenCalledWith(model)
  })

  it('revokes the object URL of a model loaded from a file', () => {
    const { model } = stubModel()
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    managerHolding({ id: '7', name: 'a.glb', model, clips: [], fileUrl: 'blob:x' }).remove('7')

    expect(revoke).toHaveBeenCalledWith('blob:x')
    revoke.mockRestore()
  })

  it('reports a miss for an id it does not hold', () => {
    expect(managerHolding({ id: '7', model: new THREE.Group(), clips: [] }).remove('nope')).toBe(false)
  })
})
