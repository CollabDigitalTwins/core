// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { disposeObject3D } from './disposeObject3D'

function stubMesh() {
  const geometry = new THREE.BufferGeometry()
  const material = new THREE.MeshBasicMaterial()
  vi.spyOn(geometry, 'dispose')
  vi.spyOn(material, 'dispose')
  return { mesh: new THREE.Mesh(geometry, material), geometry, material }
}

describe('disposeObject3D', () => {
  it('takes the object out of the scene', () => {
    const scene = new THREE.Scene()
    const { mesh } = stubMesh()
    scene.add(mesh)

    disposeObject3D(mesh)

    expect(mesh.parent).toBeNull()
    expect(scene.children).toHaveLength(0)
  })

  it('frees the geometry and material, so the GPU memory goes too', () => {
    const { mesh, geometry, material } = stubMesh()

    disposeObject3D(mesh)

    expect(geometry.dispose).toHaveBeenCalled()
    expect(material.dispose).toHaveBeenCalled()
  })

  it('reaches every descendant', () => {
    const root = new THREE.Group()
    const branch = new THREE.Group()
    const { mesh, geometry } = stubMesh()
    branch.add(mesh)
    root.add(branch)

    disposeObject3D(root)

    expect(geometry.dispose).toHaveBeenCalled()
  })

  it('frees each material of a multi-material mesh', () => {
    const first = new THREE.MeshBasicMaterial()
    const second = new THREE.MeshBasicMaterial()
    vi.spyOn(first, 'dispose')
    vi.spyOn(second, 'dispose')
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), [first, second])

    disposeObject3D(mesh)

    expect(first.dispose).toHaveBeenCalled()
    expect(second.dispose).toHaveBeenCalled()
  })

  it('copes with an object that has neither geometry nor material', () => {
    expect(() => disposeObject3D(new THREE.Group())).not.toThrow()
  })
})
