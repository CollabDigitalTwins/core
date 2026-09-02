// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { SceneObjectRegistry, sceneObjectName } from './sceneObjectRegistry'

import type { SceneObjectInput } from './sceneObjectRegistry'

function makeRegistry() {
  const scene = new THREE.Scene()
  return { scene, registry: new SceneObjectRegistry({ scene }) }
}

function input(key: string, overrides: Partial<SceneObjectInput> = {}): SceneObjectInput {
  return { key, kind: 'model', root: new THREE.Group(), ...overrides }
}

describe('SceneObjectRegistry', () => {
  it('adds an object to the scene under its prefixed key', () => {
    const { scene, registry } = makeRegistry()
    const entry = registry.add(input('12'))

    expect(entry.root.name).toBe('file:12')
    expect(scene.getObjectByName(sceneObjectName('12'))).toBe(entry.root)
    expect(registry.has('12')).toBe(true)
  })

  it('defaults fileId to null so an unplaced object is distinguishable', () => {
    const { registry } = makeRegistry()

    expect(registry.add(input('temp-1')).fileId).toBeNull()
    expect(registry.add(input('12', { fileId: '12' })).fileId).toBe('12')
  })

  it('replaces and disposes an entry added under an existing key', () => {
    const { registry } = makeRegistry()
    const dispose = vi.fn()
    registry.add(input('12', { dispose }))

    const replacement = registry.add(input('12'))

    expect(dispose).toHaveBeenCalledOnce()
    expect(registry.list()).toEqual([replacement])
  })

  it('rekeys a temporary object onto its file id', () => {
    const { registry } = makeRegistry()
    const entry = registry.add(input('temp-1'))

    registry.rekey('temp-1', '12')

    expect(registry.has('temp-1')).toBe(false)
    expect(registry.get('12')).toBe(entry)
    expect(entry.fileId).toBe('12')
    expect(entry.root.name).toBe('file:12')
  })

  it('announces a rekey, which is when a listener can first address the file', () => {
    const { registry } = makeRegistry()
    const added = vi.fn()
    registry.add(input('temp-1'))
    registry.onAdded(added)

    const entry = registry.rekey('temp-1', '12')

    expect(added).toHaveBeenCalledExactlyOnceWith(entry)
  })

  it('rekeying an unknown key changes nothing', () => {
    const { registry } = makeRegistry()

    expect(registry.rekey('missing', '12')).toBeUndefined()
    expect(registry.list()).toEqual([])
  })

  it('removes an object from the scene and disposes it', () => {
    const { scene, registry } = makeRegistry()
    const dispose = vi.fn()
    registry.add(input('12', { dispose }))

    expect(registry.remove('12')).toBe(true)
    expect(dispose).toHaveBeenCalledOnce()
    expect(scene.children).toEqual([])
    expect(registry.remove('12')).toBe(false)
  })

  it('toggles visibility of a known object only', () => {
    const { registry } = makeRegistry()
    const entry = registry.add(input('12'))

    expect(registry.setVisible('12', false)).toBe(true)
    expect(entry.root.visible).toBe(false)
    expect(registry.setVisible('missing', false)).toBe(false)
  })

  it('notifies listeners once per add and per remove', () => {
    const { registry } = makeRegistry()
    const added = vi.fn()
    const removed = vi.fn()
    registry.onAdded(added)
    const stop = registry.onRemoved(removed)

    const entry = registry.add(input('12'))
    expect(added).toHaveBeenCalledExactlyOnceWith(entry)

    stop()
    registry.remove('12')
    expect(removed).not.toHaveBeenCalled()
  })

  it('clear empties the scene and the index', () => {
    const { scene, registry } = makeRegistry()
    registry.add(input('12'))
    registry.add(input('13'))

    registry.clear()

    expect(registry.list()).toEqual([])
    expect(scene.children).toEqual([])
  })
})
