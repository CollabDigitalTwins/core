// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { restoreDepthState } from './restoreDepthState'

const flatMaterial = () => new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false })

describe('restoreDepthState', () => {
  it('re-enables depth testing the 2D viewer turned off', () => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), flatMaterial())

    restoreDepthState(mesh)

    const material = mesh.material as THREE.Material
    expect(material.depthTest).toBe(true)
    expect(material.depthWrite).toBe(true)
  })

  it('reaches materials nested anywhere in the drawing', () => {
    const root = new THREE.Group()
    const branch = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), flatMaterial())
    branch.add(mesh)
    root.add(branch)

    restoreDepthState(root)

    expect((mesh.material as THREE.Material).depthTest).toBe(true)
  })

  it('handles a multi-material object', () => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), [flatMaterial(), flatMaterial()])

    restoreDepthState(mesh)

    for (const material of mesh.material as THREE.Material[]) {
      expect(material.depthTest).toBe(true)
    }
  })

  it('leaves an object with no material alone', () => {
    const group = new THREE.Group()

    expect(() => restoreDepthState(group)).not.toThrow()
  })

  it('does not disturb anything else about the material', () => {
    const material = new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, opacity: 0.5 })
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material)

    restoreDepthState(mesh)

    expect(material.transparent).toBe(true)
    expect(material.opacity).toBe(0.5)
  })
})
