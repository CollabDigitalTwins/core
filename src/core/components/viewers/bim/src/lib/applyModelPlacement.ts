// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { modelYaw, setObjectProjectNorth } from '../../../shared/placement/projectNorth'

import type { DbFile } from '../../../../../types/dbTypes'
import type * as THREE from 'three'

export type ModelPlacementColumns = Pick<DbFile, 'fileTransformX' | 'fileTransformY' | 'fileTransformZ' | 'fileRotationY' | 'fileRotationZ'>

/** Restores a model's stored placement and project north. */
export function applyModelPlacement(object: THREE.Object3D, file: ModelPlacementColumns) {
  object.position.set(file.fileTransformX ?? 0, file.fileTransformY ?? 0, file.fileTransformZ ?? 0)
  if (file.fileRotationY != null || file.fileRotationZ != null) {
    object.rotation.y = modelYaw(file)
    setObjectProjectNorth(object, file.fileRotationZ ?? 0)
  }
  object.updateMatrixWorld(true)
}
