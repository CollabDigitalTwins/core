// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Minimal 3D vector shape so this helper stays free of a three.js import (easy to unit test). */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Camera pose in the shape `camera-controls` `setLookAt` expects. */
export interface LookAt {
  camX: number
  camY: number
  camZ: number
  tarX: number
  tarY: number
  tarZ: number
}

const DEFAULT_DIRECTION: Vec3 = { x: 1, y: 1, z: 1 }

/**
 * Frame a comment without changing the current view direction: keep looking along
 * the same axis the user already has, but re-target the comment and pull the camera
 * to `distance` away from it. Used for double-click "zoom to comment".
 *
 * Pure and three.js-free so it can be unit tested with plain objects.
 */
export function computeCommentLookAt(
  camPos: Vec3,
  target: Vec3,
  commentPoint: Vec3,
  distance = 8,
): LookAt {
  let dx = camPos.x - target.x
  let dy = camPos.y - target.y
  let dz = camPos.z - target.z
  let length = Math.hypot(dx, dy, dz)

  // Degenerate pose (camera sitting on its target): fall back to a sensible angle.
  if (length < 1e-6) {
    dx = DEFAULT_DIRECTION.x
    dy = DEFAULT_DIRECTION.y
    dz = DEFAULT_DIRECTION.z
    length = Math.hypot(dx, dy, dz)
  }

  const safeDistance = distance > 0 ? distance : 8
  const scale = safeDistance / length

  return {
    camX: commentPoint.x + dx * scale,
    camY: commentPoint.y + dy * scale,
    camZ: commentPoint.z + dz * scale,
    tarX: commentPoint.x,
    tarY: commentPoint.y,
    tarZ: commentPoint.z,
  }
}
