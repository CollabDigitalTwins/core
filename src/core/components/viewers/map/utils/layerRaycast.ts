// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

const _inverse = new THREE.Matrix4()
const _near = new THREE.Vector3()
const _far = new THREE.Vector3()
const _direction = new THREE.Vector3()
const _raycaster = new THREE.Raycaster()

/**
 * Whether a pointer is over anything a custom layer drew, using the last frame's camera.
 * Its `projectionMatrix` is the combined `VP * M`, so its inverse lands in the scene's own space.
 */
export function hitTestLayerScene(
  camera: THREE.Camera | null,
  scene: THREE.Object3D | null,
  ndcX: number,
  ndcY: number,
): boolean {
  if (!camera || !scene) return false

  _inverse.copy(camera.projectionMatrix).invert()
  _near.set(ndcX, ndcY, -1).applyMatrix4(_inverse)
  _far.set(ndcX, ndcY, 1).applyMatrix4(_inverse)
  _direction.copy(_far).sub(_near).normalize()
  _raycaster.set(_near, _direction)

  return _raycaster.intersectObjects(scene.children, true).length > 0
}

/** A pointer event as the clip-space point a layer's camera understands. */
export function ndcOfEvent(
  event: { clientX: number, clientY: number },
  rect: { left: number, top: number, width: number, height: number },
): { ndcX: number, ndcY: number } {
  return {
    ndcX: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    ndcY: -((event.clientY - rect.top) / rect.height) * 2 + 1,
  }
}
