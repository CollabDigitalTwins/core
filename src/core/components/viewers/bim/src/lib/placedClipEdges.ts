// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'

import type * as THREE from 'three'

const UNPLACED_MATRIX = 'cdtUnplacedMatrix'

type UpdateMeshes = (this: ClipEdgesInternals, modelId: string, style: string, ids?: number[]) => Promise<void>

/** The private members of OBF's `ClipEdges` this patch relies on. */
export interface ClipEdgesInternals {
  plane: THREE.Plane
  _components: OBC.Components
  updateMeshes: UpdateMeshes
  getStyleMeshes(modelId: string, style: string): Promise<{ edges?: THREE.Object3D; fills?: THREE.Object3D }>
}

function placeLikeModel(object: THREE.Object3D, placement: THREE.Matrix4) {
  object.updateMatrix()
  object.userData[UNPLACED_MATRIX] ??= object.matrix.clone()
  object.matrix.multiplyMatrices(placement, object.userData[UNPLACED_MATRIX] as THREE.Matrix4)
  object.matrix.decompose(object.position, object.quaternion, object.scale)
}

/** Wraps `ClipEdges.updateMeshes`, which cuts and draws in a model's unplaced frame, so cuts follow a moved or turned model. */
export function withModelPlacement(original: UpdateMeshes): UpdateMeshes {
  return async function (this: ClipEdgesInternals, modelId, style, ids) {
    const model = this._components.get(OBC.FragmentsManager).list.get(modelId)
    if (!model) return original.call(this, modelId, style, ids)

    model.object.updateWorldMatrix(true, false)
    const placement = model.object.matrixWorld.clone()
    const worldPlane = this.plane
    // The original clones the plane before its first await, so the swap only has to cover the synchronous call.
    this.plane = worldPlane.clone().applyMatrix4(placement.clone().invert())
    let pending: Promise<void>
    try {
      pending = original.call(this, modelId, style, ids)
    } finally {
      this.plane = worldPlane
    }
    await pending

    const { edges, fills } = await this.getStyleMeshes(modelId, style)
    for (const mesh of [edges, fills]) if (mesh) placeLikeModel(mesh, placement)
  }
}

let installed = false

/** Makes every section cut (clipping planes, section box, floorplan fill) follow each model's placement. Idempotent. */
export function installPlacedClipEdges() {
  if (installed) return
  installed = true
  const proto = OBF.ClipEdges.prototype as unknown as ClipEdgesInternals
  proto.updateMeshes = withModelPlacement(proto.updateMeshes)
}
