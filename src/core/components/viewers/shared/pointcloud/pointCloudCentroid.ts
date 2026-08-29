// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import type { PointCloudPlacement } from './pointCloudPlacement'

/** The part of a potree octree node this needs. Boxes are in the octree's own space. */
export interface PointNodeLike {
  numPoints?: number
  boundingBox?: THREE.Box3
}

/**
 * Points-weighted centre of the loaded nodes. A scan often carries a few stray returns hundreds of
 * metres out, and a bounding-box centre would follow them; weighting by point count does not.
 */
export function weightedCentroid(nodes: Iterable<PointNodeLike>): THREE.Vector3 | null {
  const centre = new THREE.Vector3()
  const scratch = new THREE.Vector3()
  let total = 0

  for (const node of nodes) {
    const points = node.numPoints ?? 0
    if (points <= 0 || !node.boundingBox || node.boundingBox.isEmpty()) continue

    node.boundingBox.getCenter(scratch)
    centre.addScaledVector(scratch, points)
    total += points
  }

  return total > 0 ? centre.divideScalar(total) : null
}

/** Falls back to a box centre when nothing has streamed in yet. */
export function centroidOrBoxCentre(
  nodes: Iterable<PointNodeLike>,
  box: THREE.Box3 | undefined,
): THREE.Vector3 | null {
  const centroid = weightedCentroid(nodes)
  if (centroid) return centroid
  if (!box || box.isEmpty()) return null
  return box.getCenter(new THREE.Vector3())
}

/** The placement that puts `worldCentre` on the scene origin. Only T moves: the matrix is T·R·S,
 *  so a shift in T moves the cloud by exactly that much whatever its rotation and scale. */
export function placementCentredOn(
  placement: PointCloudPlacement,
  worldCentre: THREE.Vector3,
): PointCloudPlacement {
  return {
    ...placement,
    position: [
      placement.position[0] - worldCentre.x,
      placement.position[1] - worldCentre.y,
      placement.position[2] - worldCentre.z,
    ],
  }
}
