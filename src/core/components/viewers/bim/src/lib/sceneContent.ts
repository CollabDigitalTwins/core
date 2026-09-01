// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DbFile } from '../../../../../types/dbTypes'
import type * as THREE from 'three'

export interface SceneContentSources {
  scene: THREE.Object3D
  /** A loaded 3D model, which `ModelManager` keys by file name. */
  modelByName: (name: string) => THREE.Object3D | null
}

/**
 * The one answer to "what in the scene is this file?", so the sidebar, the viewport menu and the
 * placement editor cannot disagree. A DXF group is named with the file id; a model by its name.
 */
export function sceneObjectForFile(
  file: Pick<DbFile, 'id' | 'name'>,
  { scene, modelByName }: SceneContentSources,
): THREE.Object3D | null {
  return modelByName(file.name) ?? scene.getObjectByName(String(file.id)) ?? null
}

/** Whether the file is in the scene and actually on screen, ancestors included. */
export function isFileInScene(
  file: Pick<DbFile, 'id' | 'name'>,
  sources: SceneContentSources,
): boolean {
  const object = sceneObjectForFile(file, sources)
  if (!object) return false

  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false
  }
  return true
}
