// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { SplatEdit, SplatEditSdf, SplatEditSdfType } from '@sparkjsdev/spark'
import * as THREE from 'three'

const SDF_LOCAL_NORMAL = new THREE.Vector3(0, 0, 1)

// Spark's classes extend THREE.Object3D, but three ships no types, so that base is `any` and TS sees none of its members.
const asObject3D = (node: SplatEdit | SplatEditSdf) => node as THREE.Object3D

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
export function syncClipSdfs(edit: SplatEdit, planes: readonly THREE.Plane[]): void {
  const sdfs = edit.sdfs ?? []

  while (sdfs.length > planes.length) {
    const removed = sdfs.pop()
    if (removed) asObject3D(removed).removeFromParent()
  }
  while (sdfs.length < planes.length) {
    const sdf = new SplatEditSdf({ type: SplatEditSdfType.PLANE, opacity: 0 })
    sdfs.push(sdf)
    asObject3D(edit).add(sdf)
  }

  for (const [index, plane] of planes.entries()) {
    const { position, quaternion } = sdfTransformForPlane(plane)
    const sdf = asObject3D(sdfs[index])
    sdf.position.copy(position)
    sdf.quaternion.copy(quaternion)
    sdf.updateMatrixWorld(true)
  }

  edit.sdfs = sdfs
}

/**
 * One scene-level `SplatEdit`, which Spark treats as global because no `SplatMesh` is its
 * ancestor, so every splat is cut — including any loaded after the planes were set.
 */
export class SplatClipper {
  private readonly edit = new SplatEdit({ sdfs: [] })

  attach(scene: THREE.Object3D): void {
    scene.add(this.edit)
  }

  apply(planes: readonly THREE.Plane[]): void {
    syncClipSdfs(this.edit, planes)
  }

  dispose(): void {
    this.edit.sdfs = []
    asObject3D(this.edit).removeFromParent()
  }
}
