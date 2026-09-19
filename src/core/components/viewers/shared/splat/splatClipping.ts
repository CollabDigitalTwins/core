// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

const SDF_LOCAL_NORMAL = new THREE.Vector3(0, 0, 1)

// Structural, so this module never imports Spark; splatLoader owns the one instance of it.
export interface ClipSdf {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  updateMatrixWorld: (force?: boolean) => void
  removeFromParent: () => void
}

export interface ClipEdit {
  sdfs: ClipSdf[] | null
  add: (sdf: ClipSdf) => void
}

/** Spark's PLANE sdf is an Object3D facing local +Z; a THREE.Plane is a normal and an offset. */
export function sdfTransformForPlane(plane: THREE.Plane) {
  const normal = plane.normal.clone().normalize()
  return {
    position: normal.clone().multiplyScalar(-plane.constant),
    quaternion: new THREE.Quaternion().setFromUnitVectors(SDF_LOCAL_NORMAL, normal),
  }
}

/**
 * Points one cutting sdf at each clipping plane. Spark unions the sdfs of an edit, so a splat
 * is dropped when it is behind any plane — the same half-space three keeps for everything else.
 */
export function syncClipSdfs(
  edit: ClipEdit,
  planes: readonly THREE.Plane[],
  createSdf: () => ClipSdf,
): void {
  const sdfs = edit.sdfs ?? []

  while (sdfs.length > planes.length) {
    const removed = sdfs.pop()
    removed?.removeFromParent()
  }
  while (sdfs.length < planes.length) {
    const sdf = createSdf()
    sdfs.push(sdf)
    edit.add(sdf)
  }

  for (const [index, plane] of planes.entries()) {
    const { position, quaternion } = sdfTransformForPlane(plane)
    sdfs[index].position.copy(position)
    sdfs[index].quaternion.copy(quaternion)
    sdfs[index].updateMatrixWorld(true)
  }

  edit.sdfs = sdfs
}
