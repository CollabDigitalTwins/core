// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import * as THREE from 'three'

const Y_UP = new THREE.Vector3(0, 1, 0)
const Z_UP = new THREE.Vector3(0, 0, 1)

/**
 * Sets THREE.Object3D.DEFAULT_UP and optionally syncs a camera-controls instance.
 * Returns a cleanup function that resets DEFAULT_UP to Y-up (the Three.js default).
 *
 * camera-controls requires an explicit `updateCameraUp()` call whenever camera.up
 * changes, otherwise the orbit axis stays stale and the scene tilts on interaction.
 */
function applyCoordinateSystem(
  up: THREE.Vector3,
  controls?: { camera: THREE.Camera; updateCameraUp(): void } | null,
) {
  THREE.Object3D.DEFAULT_UP.copy(up)

  if (controls) {
    controls.camera.up.copy(up)
    controls.updateCameraUp()
  }
}

/**
 * Hook for the BIM viewer (Y-up / standard Three.js).
 *
 * Call once the OBC world is ready, passing `world.camera.controls`.
 * On unmount the hook resets DEFAULT_UP to Y-up so the next viewer
 * starts from a clean state regardless of mount order.
 *
 * @param controls  The camera-controls instance from `world.camera.controls`.
 *                  Pass `null` / `undefined` while the world is still initialising —
 *                  the hook will re-run when it becomes available.
 */
export function useBimCoordinateSystem(
  controls?: { camera: THREE.Camera; updateCameraUp(): void } | null,
) {
  React.useEffect(() => {
    applyCoordinateSystem(Y_UP, controls)

    return () => {
      // Reset to the Three.js default so pointcloud viewer finds a clean slate
      THREE.Object3D.DEFAULT_UP.copy(Y_UP)
    }
  }, [controls])
}

/**
 * Hook for the PointCloud viewer (Z-up / Potree convention).
 *
 * On unmount it resets DEFAULT_UP back to Y-up so the BIM viewer
 * doesn't inherit Z-up if it mounts next.
 */
export function usePointCloudCoordinateSystem() {
  React.useEffect(() => {
    applyCoordinateSystem(Z_UP)

    return () => {
      THREE.Object3D.DEFAULT_UP.copy(Y_UP)
    }
  }, [])
}
