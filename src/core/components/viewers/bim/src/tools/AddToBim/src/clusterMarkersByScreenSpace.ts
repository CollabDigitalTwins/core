// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

/**
 * Screen-space clustering for 3D (BIM) comment markers.
 *
 * The BIM viewer renders each comment as an independent CSS2DObject at a world
 * position, so markers that are close together (or aligned along the camera
 * axis) overlap on screen. This groups markers whose projected screen positions
 * fall within `threshold` pixels of each other so the caller can draw a single
 * numbered cluster bubble instead of a pile of overlapping avatars.
 *
 * Pure and side-effect free (no scene mutation) so it can be unit tested.
 */

export interface HasWorldPosition {
  id: number
  x?: number | null
  y?: number | null
  z?: number | null
}

export interface ScreenCluster<T> {
  /** Stable key derived from member ids (sorted) — used for registry diffing. */
  key: string
  screenX: number
  screenY: number
  worldCenter: { x: number; y: number; z: number }
  members: T[]
}

export interface ClusterResult<T> {
  clusters: ScreenCluster<T>[]
  singles: T[]
}

export interface ProjectedPoint {
  screenX: number
  screenY: number
  /** false when the point is behind the camera. */
  onScreen: boolean
}

/** Project a world point to pixel coordinates for the given camera/viewport. */
export function projectPoint(
  x: number,
  y: number,
  z: number,
  camera: THREE.Camera,
  width: number,
  height: number,
): ProjectedPoint {
  const pos = new THREE.Vector3(x, y, z)
  // Camera-space z is positive when the point is behind the camera (it looks down -z).
  const cameraSpace = pos.clone().applyMatrix4(camera.matrixWorldInverse)
  const behind = cameraSpace.z >= 0

  const ndc = pos.project(camera)
  return {
    screenX: (ndc.x * 0.5 + 0.5) * width,
    screenY: (-ndc.y * 0.5 + 0.5) * height,
    onScreen: !behind,
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function clusterMarkersByScreenSpace<T extends HasWorldPosition>(
  items: T[],
  camera: THREE.Camera,
  width: number,
  height: number,
  threshold = 44,
): ClusterResult<T> {
  const projected = items
    .filter((it): it is T & { x: number; y: number; z: number } =>
      it.x != null && it.y != null && it.z != null,
    )
    .map((item) => ({ item, ...projectPoint(item.x, item.y, item.z, camera, width, height) }))

  const onScreen = projected.filter((p) => p.onScreen)
  const clusters: ScreenCluster<T>[] = []
  // Points behind the camera are never clustered; they fall through as singles.
  const singles: T[] = projected.filter((p) => !p.onScreen).map((p) => p.item)

  const used = new Array(onScreen.length).fill(false)

  for (let i = 0; i < onScreen.length; i++) {
    if (used[i]) continue
    used[i] = true
    const group = [onScreen[i]]

    for (let j = i + 1; j < onScreen.length; j++) {
      if (used[j]) continue
      const dx = onScreen[i].screenX - onScreen[j].screenX
      const dy = onScreen[i].screenY - onScreen[j].screenY
      if (Math.hypot(dx, dy) <= threshold) {
        used[j] = true
        group.push(onScreen[j])
      }
    }

    if (group.length === 1) {
      singles.push(group[0].item)
      continue
    }

    const members = group.map((g) => g.item)
    clusters.push({
      key: members.map((m) => m.id).sort((a, b) => a - b).join('-'),
      screenX: average(group.map((g) => g.screenX)),
      screenY: average(group.map((g) => g.screenY)),
      worldCenter: {
        x: average(members.map((m) => m.x as number)),
        y: average(members.map((m) => m.y as number)),
        z: average(members.map((m) => m.z as number)),
      },
      members,
    })
  }

  return { clusters, singles }
}
