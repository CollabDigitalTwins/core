// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { SceneObjectRegistry } from '../SceneObjects/sceneObjectRegistry'

import { hideSceneContent, isFileInScene, restoreSceneContent, sceneObjectForFile } from './sceneContent'

import type { SceneContentVisibility } from './sceneContent'

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

const root = (visible = true) => ({ visible })

describe('hideSceneContent', () => {
  it('hides every point cloud, splat and scene object, whatever the drawing sits over', () => {
    const clouds = [root()]
    const splats = [root()]
    const objects = [root()]
    const saved: SceneContentVisibility = []

    hideSceneContent([...clouds, ...splats, ...objects], saved)

    expect([clouds[0].visible, splats[0].visible, objects[0].visible]).toEqual([false, false, false])
  })

  it('records what it hid, so a restore puts back exactly that', () => {
    const roots = [root(true), root(false)]
    const saved: SceneContentVisibility = []

    hideSceneContent(roots, saved)

    expect(saved).toHaveLength(2)
  })
})

describe('restoreSceneContent', () => {
  it('puts each root back to the visibility it had', () => {
    const shown = root(true)
    const alreadyHidden = root(false)
    const saved: SceneContentVisibility = []

    hideSceneContent([shown, alreadyHidden], saved)
    restoreSceneContent(saved)

    expect(shown.visible).toBe(true)
    expect(alreadyHidden.visible).toBe(false)
  })

  it('leaves nothing recorded, so a second restore cannot re-show a deleted object', () => {
    const saved: SceneContentVisibility = []
    hideSceneContent([root()], saved)

    restoreSceneContent(saved)
    restoreSceneContent(saved)

    expect(saved).toHaveLength(0)
  })

  it('is a no-op when activate never hid anything, so a failed activate still exits cleanly', () => {
    const saved: SceneContentVisibility = []
    expect(() => restoreSceneContent(saved)).not.toThrow()
  })

  it('does not re-hide on a second hide, so the saved state is never overwritten with false', () => {
    const shown = root(true)
    const saved: SceneContentVisibility = []

    hideSceneContent([shown], saved)
    hideSceneContent([shown], saved)
    restoreSceneContent(saved)

    expect(shown.visible).toBe(true)
  })
})
