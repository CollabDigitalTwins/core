// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Get camera position and target from Potree viewer for sharing
 */

export interface CameraPosition {
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
}

/**
 * Gets the current camera position and target/pivot from Potree viewer
 */
export function getCameraPosition(viewer: any): CameraPosition | null {
  if (!viewer?.scene) {
    return null
  }

  // Get the active camera
  const camera = viewer.scene.getActiveCamera()
  if (!camera) {
    return null
  }

  // Get the pivot (target/look-at point)
  const pivot = viewer.scene.view?.getPivot()
  if (!pivot) {
    return null
  }

  return {
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    },
    target: {
      x: pivot.x,
      y: pivot.y,
      z: pivot.z
    }
  }
}
