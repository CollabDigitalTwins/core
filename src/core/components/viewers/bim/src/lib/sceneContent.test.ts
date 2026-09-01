// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { isFileInScene, sceneObjectForFile } from './sceneContent'

import type { DbFile } from '../../../../../types/dbTypes'

const file = (id: number, name: string) => ({ id, name } as DbFile)

function sources(scene: THREE.Object3D, models: Record<string, THREE.Object3D> = {}) {
  return { scene, modelByName: (name: string) => models[name] ?? null }
}

describe('sceneObjectForFile', () => {
  it('finds a loaded 3D model by file name, which is how ModelManager keys it', () => {
    const model = new THREE.Group()

    const found = sceneObjectForFile(file(3, 'panel.glb'), sources(new THREE.Scene(), { 'panel.glb': model }))

    expect(found).toBe(model)
  })

  it('finds a DXF group by file id, which is how it is named in the scene', () => {
    const scene = new THREE.Scene()
    const group = new THREE.Group()
    group.name = '7'
    scene.add(group)

    expect(sceneObjectForFile(file(7, 'plan.dxf'), sources(scene))).toBe(group)
  })

  it('finds a DXF group nested below the scene root', () => {
    const scene = new THREE.Scene()
    const branch = new THREE.Group()
    const group = new THREE.Group()
    group.name = '7'
    branch.add(group)
    scene.add(branch)

    expect(sceneObjectForFile(file(7, 'plan.dxf'), sources(scene))).toBe(group)
  })

  it('finds nothing for a file that is not in the scene', () => {
    expect(sceneObjectForFile(file(9, 'ghost.glb'), sources(new THREE.Scene()))).toBeNull()
  })

  it('prefers the model registry over a same-named group', () => {
    const scene = new THREE.Scene()
    const stray = new THREE.Group()
    stray.name = '3'
    scene.add(stray)
    const model = new THREE.Group()

    expect(sceneObjectForFile(file(3, 'panel.glb'), sources(scene, { 'panel.glb': model }))).toBe(model)
  })
})

describe('isFileInScene', () => {
  it('reports a visible object as present', () => {
    const model = new THREE.Group()

    expect(isFileInScene(file(3, 'panel.glb'), sources(new THREE.Scene(), { 'panel.glb': model }))).toBe(true)
  })

  it('reports a hidden object as absent, matching what the user sees', () => {
    const model = new THREE.Group()
    model.visible = false

    expect(isFileInScene(file(3, 'panel.glb'), sources(new THREE.Scene(), { 'panel.glb': model }))).toBe(false)
  })

  it('reports an object whose parent is hidden as absent', () => {
    const scene = new THREE.Scene()
    const branch = new THREE.Group()
    branch.visible = false
    const group = new THREE.Group()
    group.name = '7'
    branch.add(group)
    scene.add(branch)

    expect(isFileInScene(file(7, 'plan.dxf'), sources(scene))).toBe(false)
  })

  it('reports a file that is not loaded as absent', () => {
    expect(isFileInScene(file(9, 'ghost.glb'), sources(new THREE.Scene()))).toBe(false)
  })
})
