// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins


import { hoverMaterial, selectedMaterial } from '../lib/highlightMaterials'

import type { HighlightLevel } from '../lib/highlightMaterials'
import type * as THREE from 'three'

const noRaycast = () => {}

// clone(true) pairs children 1:1 in order, so each skinned clone rebinds to its own counterpart's skeleton.
function bindSkinnedClones(original: THREE.Object3D, clone: THREE.Object3D): void {
  const originalMesh = original as THREE.SkinnedMesh
  if (originalMesh.isSkinnedMesh) (clone as THREE.SkinnedMesh).bind(originalMesh.skeleton, originalMesh.bindMatrix)
  for (const [index, child] of original.children.entries()) bindSkinnedClones(child, clone.children[index])
}

/** The cyan overlay for anything that is a plain scene object: a loaded model, a DXF group. */
export class SceneObjectHighlight {
  private readonly materials: Record<'hover' | 'selected', THREE.Material>
  private overlay: THREE.Object3D | null = null
  private target: THREE.Object3D | null = null
  private readonly detachFromTarget = () => this.clear()

  constructor() {
    this.materials = { hover: hoverMaterial(), selected: selectedMaterial() }
  }

  set(root: THREE.Object3D | null, level: HighlightLevel) {
    this.clear()
    if (!root || level === 'none') return

    const overlay = root.clone(true)
    overlay.position.set(0, 0, 0)
    overlay.quaternion.identity()
    overlay.scale.set(1, 1, 1)
    overlay.updateMatrix()

    bindSkinnedClones(root, overlay)
    overlay.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.material = this.materials[level]
      mesh.raycast = noRaycast
    })

    root.add(overlay)
    root.addEventListener('removed', this.detachFromTarget)
    this.overlay = overlay
    this.target = root
  }

  clear() {
    this.target?.removeEventListener('removed', this.detachFromTarget)
    this.target = null
    this.overlay?.removeFromParent()
    this.overlay = null
  }

  dispose() {
    this.clear()
    for (const material of Object.values(this.materials)) material.dispose()
  }
}
