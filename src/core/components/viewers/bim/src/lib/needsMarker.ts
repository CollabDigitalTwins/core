// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

/** Below this on-screen size, right-clicking the geometry itself is too fiddly to rely on. */
export const MIN_PICKABLE_PX = 24

const box = new THREE.Box3()
const size = new THREE.Vector3()
const centre = new THREE.Vector3()

/**
 * Whether a placed object is too small on screen to right-click, and so still needs its marker.
 */
export function needsMarker(
  object: THREE.Object3D,
  camera: THREE.Camera,
  viewportHeightPx: number,
): boolean {
  box.setFromObject(object)
  if (box.isEmpty()) return true

  box.getSize(size)
  const radius = size.length() / 2
  if (radius <= 0) return true

  return radius * 2 * pixelsPerUnit(camera, box.getCenter(centre), viewportHeightPx) < MIN_PICKABLE_PX
}

function pixelsPerUnit(camera: THREE.Camera, at: THREE.Vector3, viewportHeightPx: number): number {
  const ortho = camera as THREE.OrthographicCamera
  if (ortho.isOrthographicCamera) {
    const worldHeight = (ortho.top - ortho.bottom) / (ortho.zoom || 1)
    return worldHeight > 0 ? viewportHeightPx / worldHeight : 0
  }

  const perspective = camera as THREE.PerspectiveCamera
  const distance = perspective.position.distanceTo(at)
  if (distance <= 0) return Number.POSITIVE_INFINITY

  const worldHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(perspective.fov) / 2)
  return worldHeight > 0 ? viewportHeightPx / worldHeight : 0
}
