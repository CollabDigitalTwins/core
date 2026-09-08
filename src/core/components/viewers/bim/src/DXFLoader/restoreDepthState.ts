// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as THREE from 'three'

/**
 * `dxf-viewer` disables depth testing for its own flat 2D viewer, which in a 3D world floats
 * the drawing over the model instead of letting it be hidden.
 */
export function restoreDepthState(object: THREE.Object3D) {
  object.traverse((child) => {
    const material = (child as THREE.Mesh).material
    if (!material) return

    for (const single of Array.isArray(material) ? material : [material]) {
      single.depthTest = true
      single.depthWrite = true
    }
  })
}
