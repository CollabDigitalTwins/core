// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

/** Potree's own default pick window; wide enough that a sparse cloud is still clickable. */
export const SCENE_PICK_WINDOW_PX = 17

export interface ScenePick {
  point: THREE.Vector3
  distance: number
}

/** As much of a `THREE.Intersection` as the measurement tools rely on. */
export interface LastPickLike {
  point?: THREE.Vector3
  distance?: number
}

/** How a non-fragment renderer offers itself to the BIM tools without them knowing what it is. */
export interface ScenePickSource {
  pick(ray: THREE.Ray, camera: THREE.Camera, thresholdPx: number): { point: THREE.Vector3 } | null
}

/** The nearest hit across every source, or null when none of them hit. */
export function pickNearest(
  sources: Iterable<ScenePickSource>,
  ray: THREE.Ray,
  camera: THREE.Camera,
  thresholdPx: number,
): ScenePick | null {
  let nearest: ScenePick | null = null

  for (const source of sources) {
    const hit = safePick(source, ray, camera, thresholdPx)
    if (!hit) continue

    const distance = ray.origin.distanceTo(hit.point)
    if (!nearest || distance < nearest.distance) nearest = { point: hit.point, distance }
  }

  return nearest
}

/**
 * The candidate when it is strictly in front of `current`, else null. Ties go to `current`
 * so a fragment snap — which draws a marker — wins over a bare point.
 */
export function betterPick(
  current: { point?: THREE.Vector3; distance?: number } | null | undefined,
  candidate: ScenePick | null,
  ray: THREE.Ray,
): ScenePick | null {
  if (!candidate) return null
  if (!current?.point) return candidate

  const currentDistance = typeof current.distance === 'number'
    ? current.distance
    : ray.origin.distanceTo(current.point)

  return candidate.distance < currentDistance ? candidate : null
}

function safePick(
  source: ScenePickSource,
  ray: THREE.Ray,
  camera: THREE.Camera,
  thresholdPx: number,
): { point: THREE.Vector3 } | null {
  try {
    return source.pick(ray, camera, thresholdPx)
  } catch (error) {
    console.warn('scenePicker: a pick source failed', error)
    return null
  }
}

/** Pointer position in normalised device coordinates, ready for `Raycaster.setFromCamera`. */
export function ndcFromPointer(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): THREE.Vector2 | null {
  if (rect.width <= 0 || rect.height <= 0) return null
  return new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  )
}

/** Merges a nearer scene hit into a measurer's `lastPick` on write, because the library's own
 *  preview handler is subscribed in its constructor and reads it first. Returns the undo. */
export function interceptLastPick(
  measurer: object,
  nearer: (current: LastPickLike | null) => ScenePick | null,
): () => void {
  const holder = measurer as Record<string, unknown>
  let value = (holder.lastPick ?? null) as LastPickLike | null

  Object.defineProperty(measurer, 'lastPick', {
    configurable: true,
    enumerable: true,
    get: () => value,
    set: (incoming: LastPickLike | null) => { value = merged(incoming, nearer) },
  })

  return () => {
    delete holder.lastPick
    holder.lastPick = value
  }
}

function merged(
  incoming: LastPickLike | null,
  nearer: (current: LastPickLike | null) => ScenePick | null,
): LastPickLike | null {
  try {
    return nearer(incoming) ?? incoming
  } catch (error) {
    console.warn('scenePicker: could not merge a scene pick', error)
    return incoming
  }
}
