// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import type { PointCloudPlacement, PointCloudSourceUp } from './pointCloudPlacement'

/** Rotation taking a source cloud's up axis onto the BIM scene's Y-up. */
export function upAxisQuaternion(sourceUp: PointCloudSourceUp): THREE.Quaternion {
  const quaternion = new THREE.Quaternion()
  if (sourceUp === 'z') quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
  return quaternion
}

/** Levels one object onto the BIM scene's Y-up, instead of mutating the global DEFAULT_UP. */
export function applyObjectUpAxis(object: THREE.Object3D, sourceUp: PointCloudSourceUp): void {
  object.quaternion.copy(upAxisQuaternion(sourceUp))
}

/** Composes a placement into the matrix for a cloud's root node. */
export function placementToMatrix(placement: PointCloudPlacement): THREE.Matrix4 {
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...placement.rotation))
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...placement.position),
    rotation,
    new THREE.Vector3().setScalar(placement.scale),
  )
}

/** Decomposes a root node's matrix back into a placement. */
export function matrixToPlacement(matrix: THREE.Matrix4, sourceUp: PointCloudSourceUp): PointCloudPlacement {
  const position = new THREE.Vector3()
  const rotation = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  matrix.decompose(position, rotation, scale)
  const euler = new THREE.Euler().setFromQuaternion(rotation)

  return {
    position: [position.x, position.y, position.z],
    rotation: [euler.x, euler.y, euler.z],
    scale: scale.x,
    sourceUp,
  }
}
