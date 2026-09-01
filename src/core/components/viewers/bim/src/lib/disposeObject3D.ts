// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as THREE from 'three'

/** Detaches an object and frees its geometry and materials. Three.js frees neither on removal. */
export function disposeObject3D(object: THREE.Object3D) {
  object.removeFromParent()

  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    mesh.geometry?.dispose()

    const material = mesh.material
    if (!material) return
    for (const single of Array.isArray(material) ? material : [material]) single.dispose()
  })
}
