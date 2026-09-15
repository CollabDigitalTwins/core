// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins


import { hoverMaterial, selectedMaterial } from '../lib/highlightMaterials'

import type { HighlightLevel } from '../lib/highlightMaterials'
import type * as THREE from 'three'

/** The cyan overlay for anything that is a plain scene object: a loaded model, a DXF group. */
export class SceneObjectHighlight {
  private readonly scene: THREE.Object3D
  private readonly materials: Record<'hover' | 'selected', THREE.Material>
  private overlay: THREE.Object3D | null = null

  constructor(scene: THREE.Object3D) {
    this.scene = scene
    this.materials = { hover: hoverMaterial(), selected: selectedMaterial() }
  }

  set(root: THREE.Object3D | null, level: HighlightLevel) {
    this.clear()
    if (!root || level === 'none') return

    root.updateMatrixWorld(true)
    const overlay = root.clone(true)
    overlay.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) mesh.material = this.materials[level]
    })
    overlay.matrix.copy(root.matrixWorld)
    overlay.matrix.decompose(overlay.position, overlay.quaternion, overlay.scale)

    this.scene.add(overlay)
    this.overlay = overlay
  }

  clear() {
    if (!this.overlay) return
    this.overlay.removeFromParent()
    this.overlay = null
  }

  dispose() {
    this.clear()
    for (const material of Object.values(this.materials)) material.dispose()
  }
}
