// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DbFile } from '../../../../../types/dbTypes'
import type * as THREE from 'three'

/** Restores a model's stored placement. `LoadModels.setupModel` resets every load to the origin. */
export function applyModelPlacement(object: THREE.Object3D, file: Pick<DbFile, 'fileTransformX' | 'fileTransformY' | 'fileTransformZ' | 'fileRotationY'>) {
  object.position.set(file.fileTransformX ?? 0, file.fileTransformY ?? 0, file.fileTransformZ ?? 0)
  if (file.fileRotationY != null) object.rotation.y = file.fileRotationY
  object.updateMatrixWorld(true)
}
