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

const skinnedRoot = () => {
  const bone = new THREE.Bone()
  bone.position.set(0, 1, 0)
  const mesh = new THREE.SkinnedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
  mesh.add(bone)
  mesh.bind(new THREE.Skeleton([bone]))
  return mesh
}

const animatedRoot = () => {
  const root = new THREE.Group()
  const blade = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
  root.add(blade)
  return { root, blade }
}

describe('SceneObjectHighlight', () => {
  it('follows a node the animation moves, rather than freezing at the bind pose', () => {
    const { root, blade } = animatedRoot()
    const highlight = new SceneObjectHighlight()
    highlight.set(root, 'selected')

    const overlay = root.children[1]
    const clone = overlay.children[0] as THREE.Mesh

    // What an AnimationMixer does to a blade driven by a transform track.
    blade.rotation.z = Math.PI / 3
    root.updateMatrixWorld(true)
    clone.onBeforeRender(null as never, null as never, null as never, null as never, null as never, null as never)

    expect(clone.matrixWorld.elements).toEqual(blade.matrixWorld.elements)
  })

  it('adds one overlay as a child of the highlighted root', () => {
    const root = meshRoot()
    new SceneObjectHighlight().set(root, 'hover')
    expect(root.children).toHaveLength(2)
  })

  it('replaces the overlay rather than stacking when the level changes', () => {
    const root = meshRoot()
    const highlight = new SceneObjectHighlight()

    highlight.set(root, 'hover')
    expect(root.children).toHaveLength(2)

    highlight.set(root, 'selected')
    expect(root.children).toHaveLength(2)
  })

  it('removes the overlay for none', () => {
    const root = meshRoot()
    const highlight = new SceneObjectHighlight()

    highlight.set(root, 'selected')
    highlight.set(null, 'none')

    expect(root.children).toHaveLength(1)
  })

  it('leaves the object its own materials', () => {
    const root = meshRoot()
    const original = (root.children[0] as THREE.Mesh).material

    new SceneObjectHighlight().set(root, 'selected')

    expect((root.children[0] as THREE.Mesh).material).toBe(original)
  })

  it('follows the original after it moves, not just where it was when selected', () => {
    const root = meshRoot()
    const originalMesh = root.children[0]
    const highlight = new SceneObjectHighlight()
    highlight.set(root, 'selected')

    root.position.set(5, 0, 0)
    root.updateMatrixWorld(true)

    const overlay = root.children.find((child) => child !== originalMesh)!
    const overlayWorldPosition = overlay.getWorldPosition(new THREE.Vector3())

    expect(overlayWorldPosition.toArray()).toEqual([5, 0, 0])
  })

  it('binds a cloned SkinnedMesh to the original skeleton', () => {
    const root = skinnedRoot()

    new SceneObjectHighlight().set(root, 'selected')

    const overlay = root.children.find((child) => (child as THREE.SkinnedMesh).isSkinnedMesh) as
      | THREE.SkinnedMesh
      | undefined
    expect(overlay).toBeDefined()
    expect(overlay?.skeleton).toBe(root.skeleton)
  })

  it('does not change the bounding box of the highlighted root', () => {
    const root = meshRoot()
    const before = new THREE.Box3().setFromObject(root)

    new SceneObjectHighlight().set(root, 'selected')
    const after = new THREE.Box3().setFromObject(root)

    expect(after.min.toArray()).toEqual(before.min.toArray())
    expect(after.max.toArray()).toEqual(before.max.toArray())
  })

  it('is not itself raycast-hittable, so a selected object cannot pick itself twice', () => {
    const root = meshRoot()
    root.updateMatrixWorld(true)
    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1))
    const hitsBefore = raycaster.intersectObject(root, true).length

    new SceneObjectHighlight().set(root, 'selected')
    root.updateMatrixWorld(true)
    const hitsAfter = raycaster.intersectObject(root, true).length

    expect(hitsAfter).toBe(hitsBefore)
  })

  it('detaches automatically when the highlighted root leaves the scene', () => {
    const scene = new THREE.Group()
    const root = meshRoot()
    scene.add(root)
    new SceneObjectHighlight().set(root, 'selected')

    root.removeFromParent()

    expect(root.children).toHaveLength(1)
  })
})
