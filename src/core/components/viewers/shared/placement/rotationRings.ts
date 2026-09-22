// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

export const FULL_TURN = Math.PI * 2

/**
 * Closes TransformControls' half-circle rotation rings. Its pickers are already whole
 * torus, so half of every ring is grabbable but undrawn until this runs.
 */
export function completeRotationRings(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    const geometry = mesh.geometry as THREE.TorusGeometry | undefined
    if (geometry?.type !== 'TorusGeometry') return

    const { radius, tube, radialSegments, tubularSegments, arc } = geometry.parameters
    if (arc >= FULL_TURN) return

    const whole = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments, FULL_TURN)
    // The gizmo builds its rings in this orientation, so a replacement must arrive in it too.
    whole.rotateY(Math.PI / 2)
    whole.rotateX(Math.PI / 2)
    geometry.dispose()
    mesh.geometry = whole
  })
}
