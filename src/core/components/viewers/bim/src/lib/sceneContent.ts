// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DbFile } from '../../../../../types/dbTypes'
import type { SceneObjectRegistry } from '../SceneObjects/sceneObjectRegistry'
import type * as THREE from 'three'

/**
 * The one answer to "what in the scene is this file?", so the sidebar, the viewport menu and the
 * placement editor cannot disagree. Everything is keyed by file id, models and drawings alike.
 */
export function sceneObjectForFile(
  file: Pick<DbFile, 'id'>,
  registry: SceneObjectRegistry | null,
): THREE.Object3D | null {
  return registry?.get(String(file.id))?.root ?? null
}

/** Whether the file is in the scene and actually on screen, ancestors included. */
export function isFileInScene(
  file: Pick<DbFile, 'id'>,
  registry: SceneObjectRegistry | null,
): boolean {
  const object = sceneObjectForFile(file, registry)
  if (!object) return false

  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false
  }
  return true
}
