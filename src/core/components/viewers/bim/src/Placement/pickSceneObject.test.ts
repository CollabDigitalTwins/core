// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { SceneObjectRegistry } from '../SceneObjects/sceneObjectRegistry'

import { pickSceneObject } from './pickSceneObject'

// A GLB arrives as meshes; a DXF as line segments in a group scaled to metres.
function modelRoot(): THREE.Object3D {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
  const group = new THREE.Group()
  group.add(mesh)
  return group
}

function drawingRoot(): THREE.Object3D {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-500, 0, 0),
    new THREE.Vector3(500, 0, 0),
  ])
  const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial())
  const group = new THREE.Group()
  group.add(lines)
  group.rotateX(-Math.PI / 2)
  group.scale.setScalar(0.001)
  return group
}

function rayDownAt(x: number, z: number): THREE.Raycaster {
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(x, 10, z),
    new THREE.Vector3(0, -1, 0),
  )
  raycaster.params.Line = { threshold: 1 }
  return raycaster
}

function makeRegistry() {
  const scene = new THREE.Scene()
  return new SceneObjectRegistry({ scene })
}

describe('pickSceneObject', () => {
  it('picks a model by its file id', () => {
    const registry = makeRegistry()
    registry.add({ key: '3', fileId: '3', kind: 'model', root: modelRoot() })

    expect(pickSceneObject(registry.list(), rayDownAt(0, 0))?.fileId).toBe('3')
  })

  it('picks a drawing by its file id, exactly as it picks a model', () => {
    const registry = makeRegistry()
    registry.add({ key: '4', fileId: '4', kind: 'dxf', root: drawingRoot() })

    expect(pickSceneObject(registry.list(), rayDownAt(0, 0))?.fileId).toBe('4')
  })

  it('finds nothing where no object sits', () => {
    const registry = makeRegistry()
    registry.add({ key: '3', fileId: '3', kind: 'model', root: modelRoot() })

    expect(pickSceneObject(registry.list(), rayDownAt(50, 50))).toBeNull()
  })

  it('skips an object still being placed, which has no file record yet', () => {
    const registry = makeRegistry()
    registry.add({ key: 'temp-1', kind: 'model', root: modelRoot() })

    expect(pickSceneObject(registry.list(), rayDownAt(0, 0))).toBeNull()
  })

  it('skips a hidden object, so a toggled-off row opens no menu', () => {
    const registry = makeRegistry()
    registry.add({ key: '3', fileId: '3', kind: 'model', root: modelRoot() })
    registry.setVisible('3', false)

    expect(pickSceneObject(registry.list(), rayDownAt(0, 0))).toBeNull()
  })

  it('returns the nearer of two stacked objects', () => {
    const registry = makeRegistry()
    const low = modelRoot()
    const high = modelRoot()
    high.position.y = 5
    registry.add({ key: '3', fileId: '3', kind: 'model', root: low })
    registry.add({ key: '4', fileId: '4', kind: 'model', root: high })

    expect(pickSceneObject(registry.list(), rayDownAt(0, 0))?.fileId).toBe('4')
  })
})
