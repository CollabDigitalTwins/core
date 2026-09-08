// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DbFile } from '../../../../../types/dbTypes'
import type * as THREE from 'three'

/** Restores a model's stored placement. `LoadModels.setupModel` resets every load to the origin. */
export function applyModelPlacement(object: THREE.Object3D, file: Pick<DbFile, 'x' | 'y' | 'z' | 'bimRotation'>) {
  object.position.set(file.x ?? 0, file.y ?? 0, file.z ?? 0)
  if (file.bimRotation != null) object.rotation.y = file.bimRotation
  object.updateMatrixWorld(true)
}
