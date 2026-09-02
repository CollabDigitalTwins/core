// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { ObjectHit } from './resolveViewportTarget'
import type { SceneObject } from '../SceneObjects'
import type * as THREE from 'three'

/**
 * Nearest registered object under the ray. Everything is addressed by file id, so a drawing and a
 * model are picked by the same code — the divergence that used to hide DXF from the menu.
 */
export function pickSceneObject(
  entries: Iterable<SceneObject>,
  raycaster: THREE.Raycaster,
): ObjectHit | null {
  let nearest: ObjectHit | null = null

  for (const entry of entries) {
    // An object still being placed has no record to open a menu against.
    if (!entry.fileId || !entry.root.visible) continue

    // The renderer draws on demand, so nothing else guarantees the world matrix is current.
    entry.root.updateMatrixWorld(true)

    const hit = raycaster.intersectObject(entry.root, true)[0]
    if (!hit) continue
    if (!nearest || hit.distance < nearest.distance) {
      nearest = { fileId: entry.fileId, distance: hit.distance }
    }
  }

  return nearest
}
