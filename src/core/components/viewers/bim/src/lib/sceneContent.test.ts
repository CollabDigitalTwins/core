// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { SceneObjectRegistry } from '../SceneObjects/sceneObjectRegistry'

import { isFileInScene, sceneObjectForFile } from './sceneContent'

const file = { id: 12 }

function makeRegistry() {
  const scene = new THREE.Scene()
  return { scene, registry: new SceneObjectRegistry({ scene }) }
}

describe('sceneObjectForFile', () => {
  it('finds a model and a drawing under the same key', () => {
    const { registry } = makeRegistry()
    const model = registry.add({ key: '12', fileId: '12', kind: 'model', root: new THREE.Group() })
    const drawing = registry.add({ key: '13', fileId: '13', kind: 'dxf', root: new THREE.Group() })

    expect(sceneObjectForFile(file, registry)).toBe(model.root)
    expect(sceneObjectForFile({ id: 13 }, registry)).toBe(drawing.root)
  })

  it('is null for an absent file and for a registry that has no world yet', () => {
    expect(sceneObjectForFile(file, makeRegistry().registry)).toBeNull()
    expect(sceneObjectForFile(file, null)).toBeNull()
  })
})

describe('isFileInScene', () => {
  it('is true only while the object and every ancestor is visible', () => {
    const { scene, registry } = makeRegistry()
    const { root } = registry.add({ key: '12', fileId: '12', kind: 'model', root: new THREE.Group() })

    expect(isFileInScene(file, registry)).toBe(true)

    root.visible = false
    expect(isFileInScene(file, registry)).toBe(false)

    root.visible = true
    scene.visible = false
    expect(isFileInScene(file, registry)).toBe(false)
  })

  it('is false for a file that never loaded', () => {
    expect(isFileInScene(file, makeRegistry().registry)).toBe(false)
  })
})
