// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import type { PointCloudPlacement } from './pointCloudPlacement'

const EPSILON = 1e-9

const samePoint = (a: readonly number[], b: readonly number[]) =>
  a.every((value, index) => Math.abs(value - b[index]) < EPSILON)

/** The placement to apply so `pivot` stays put. A translation passes through untouched, so
 *  `position` keeps meaning the offset from the scan's own georeferenced origin. */
export function placementWithPivot(
  current: PointCloudPlacement,
  next: PointCloudPlacement,
  pivot: THREE.Vector3 | null,
): PointCloudPlacement {
  if (!pivot) return next
  if (!samePoint(current.position, next.position)) return next
  if (samePoint(current.rotation, next.rotation) && current.scale === next.scale) return next

  const local = pivotInPlacementSpace(current, pivot)
  const moved = local
    .multiplyScalar(next.scale)
    .applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...next.rotation)))
  const position = pivot.clone().sub(moved)

  return { ...next, position: [position.x, position.y, position.z] }
}

/** Where `pivot` sits in the space the placement transforms, i.e. before its own T, R and S. */
function pivotInPlacementSpace(placement: PointCloudPlacement, pivot: THREE.Vector3): THREE.Vector3 {
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...placement.rotation))
  const scale = placement.scale || 1

  return pivot
    .clone()
    .sub(new THREE.Vector3(...placement.position))
    .applyQuaternion(rotation.invert())
    .divideScalar(scale)
}

/** A gizmo dragged at the pivot rather than at the cloud's origin. */
export interface PivotDrag {
  /** Where the gizmo proxy now sits in world space. */
  position: THREE.Vector3
  /** Turn applied since the drag began. */
  quaternion: THREE.Quaternion
  /** Scale applied since the drag began. */
  scale: number
}

/** The placement for `base` after a drag of its pivot gizmo, keeping `pivot` under the handles. */
export function placementFromPivotDrag(
  base: PointCloudPlacement,
  pivot: THREE.Vector3,
  drag: PivotDrag,
): PointCloudPlacement {
  const rotation = drag.quaternion
    .clone()
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...base.rotation)))
  const scale = base.scale * drag.scale

  const held = pivotInPlacementSpace(base, pivot)
    .multiplyScalar(scale)
    .applyQuaternion(rotation)
  const position = pivot.clone().sub(held).add(drag.position).sub(pivot)

  const euler = new THREE.Euler().setFromQuaternion(rotation)
  return {
    ...base,
    position: [position.x, position.y, position.z],
    rotation: [euler.x, euler.y, euler.z],
    scale,
  }
}
