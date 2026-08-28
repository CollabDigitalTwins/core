// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

export const CLIP_BOX_FACES = ['x-', 'x+', 'y-', 'y+', 'z-', 'z+'] as const

export type ClipBoxFace = (typeof CLIP_BOX_FACES)[number]

/** Metres of thickness a box keeps on every axis, so a dragged face can never invert it. */
export const MIN_CLIP_BOX_SIZE = 0.1

/** Fraction of the target's size left as breathing room when fitting, per side. */
const FIT_PADDING = 0.05

/** Metres the helper sits inside the planes. three's global clipping has no per-object opt-out,
 *  so anything drawn on or outside the boundary is discarded by the box's own cut. */
export const CLIP_BOX_HELPER_INSET = 0.001

const AXIS_OF: Record<ClipBoxFace, 'x' | 'y' | 'z'> = {
  'x-': 'x', 'x+': 'x', 'y-': 'y', 'y+': 'y', 'z-': 'z', 'z+': 'z',
}

const OUTWARD: Record<ClipBoxFace, THREE.Vector3> = {
  'x-': new THREE.Vector3(-1, 0, 0),
  'x+': new THREE.Vector3(1, 0, 0),
  'y-': new THREE.Vector3(0, -1, 0),
  'y+': new THREE.Vector3(0, 1, 0),
  'z-': new THREE.Vector3(0, 0, -1),
  'z+': new THREE.Vector3(0, 0, 1),
}

export function faceOutwardNormal(face: ClipBoxFace): THREE.Vector3 {
  return OUTWARD[face].clone()
}

export function faceCentre(box: THREE.Box3, face: ClipBoxFace): THREE.Vector3 {
  const centre = box.getCenter(new THREE.Vector3())
  const axis = AXIS_OF[face]
  centre[axis] = isMaxFace(face) ? box.max[axis] : box.min[axis]
  return centre
}

/**
 * The six inward planes whose intersection is the box interior. three's clipping is an AND
 * across planes, so this alone gives keep-inside behaviour with no shader work.
 */
export function boxClipPlanes(box: THREE.Box3): THREE.Plane[] {
  return CLIP_BOX_FACES.map((face) => {
    const outward = OUTWARD[face]
    return new THREE.Plane(outward.clone().negate(), outward.dot(faceCentre(box, face)))
  })
}

/** A copy of `box` with one face dragged to `target`, never thinner than {@link MIN_CLIP_BOX_SIZE}. */
export function moveFace(box: THREE.Box3, face: ClipBoxFace, target: THREE.Vector3): THREE.Box3 {
  const moved = box.clone()
  const axis = AXIS_OF[face]

  if (isMaxFace(face)) {
    moved.max[axis] = Math.max(target[axis], moved.min[axis] + MIN_CLIP_BOX_SIZE)
  } else {
    moved.min[axis] = Math.min(target[axis], moved.max[axis] - MIN_CLIP_BOX_SIZE)
  }

  return moved
}

/** A padded box around `target`, usable even when the model bounds are empty. */
export function fittedBox(target: THREE.Box3): THREE.Box3 {
  if (target.isEmpty()) {
    const half = MIN_CLIP_BOX_SIZE * 50
    return new THREE.Box3(new THREE.Vector3(-half, -half, -half), new THREE.Vector3(half, half, half))
  }

  const size = target.getSize(new THREE.Vector3())
  const padding = new THREE.Vector3(
    Math.max(size.x * FIT_PADDING, MIN_CLIP_BOX_SIZE),
    Math.max(size.y * FIT_PADDING, MIN_CLIP_BOX_SIZE),
    Math.max(size.z * FIT_PADDING, MIN_CLIP_BOX_SIZE),
  )

  return new THREE.Box3(target.min.clone().sub(padding), target.max.clone().add(padding))
}

function isMaxFace(face: ClipBoxFace): boolean {
  return face.endsWith('+')
}

/** Where a face's grab handle sits: fully inside the box, so its own planes cannot discard it. */
export function handleCentre(box: THREE.Box3, face: ClipBoxFace, handleSize: number): THREE.Vector3 {
  const inward = faceOutwardNormal(face).negate()
  return faceCentre(box, face).addScaledVector(inward, handleSize / 2 + CLIP_BOX_HELPER_INSET)
}

/** Shell dimensions that clear the planes on every axis, never negative on a minimal box. */
export function helperShellSize(box: THREE.Box3): THREE.Vector3 {
  const size = box.getSize(new THREE.Vector3())
  const inset = CLIP_BOX_HELPER_INSET * 2
  return new THREE.Vector3(
    Math.max(size.x - inset, MIN_CLIP_BOX_SIZE / 2),
    Math.max(size.y - inset, MIN_CLIP_BOX_SIZE / 2),
    Math.max(size.z - inset, MIN_CLIP_BOX_SIZE / 2),
  )
}
