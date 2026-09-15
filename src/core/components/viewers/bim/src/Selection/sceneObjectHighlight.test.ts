// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { SceneObjectHighlight } from './sceneObjectHighlight'

const meshRoot = () => {
  const root = new THREE.Group()
  root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()))
  return root
}

describe('SceneObjectHighlight', () => {
  it('adds one overlay for the highlighted object', () => {
    const scene = new THREE.Group()
    new SceneObjectHighlight(scene).set(meshRoot(), 'hover')
    expect(scene.children).toHaveLength(1)
  })

  it('replaces the overlay rather than stacking when the level changes', () => {
    const scene = new THREE.Group()
    const highlight = new SceneObjectHighlight(scene)

    highlight.set(meshRoot(), 'hover')
    highlight.set(meshRoot(), 'selected')

    expect(scene.children).toHaveLength(1)
  })

  it('removes the overlay for none', () => {
    const scene = new THREE.Group()
    const highlight = new SceneObjectHighlight(scene)

    highlight.set(meshRoot(), 'selected')
    highlight.set(null, 'none')

    expect(scene.children).toHaveLength(0)
  })

  it('leaves the object its own materials', () => {
    const scene = new THREE.Group()
    const root = meshRoot()
    const original = (root.children[0] as THREE.Mesh).material

    new SceneObjectHighlight(scene).set(root, 'selected')

    expect((root.children[0] as THREE.Mesh).material).toBe(original)
  })
})
