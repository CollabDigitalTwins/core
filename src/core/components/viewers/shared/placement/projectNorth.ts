// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DbFile } from '../../../../types/dbTypes'
import type * as THREE from 'three'

const PROJECT_NORTH_KEY = 'projectNorth'

interface PlanPointLike {
  x: number
  z: number
}

/** `radians` wrapped into (-π, π]. */
export function normalizeAngle(radians: number): number {
  const wrapped = ((radians + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
  return wrapped === -Math.PI ? Math.PI : wrapped
}

/** A model's scene yaw: its placement turn (`fileRotationY`) plus its project north (`fileRotationZ`). */
export function modelYaw(file: Pick<DbFile, 'fileRotationY' | 'fileRotationZ'>): number {
  return (file.fileRotationY ?? 0) + (file.fileRotationZ ?? 0)
}

/** The project north stamped on `object` by `setObjectProjectNorth`, else 0. */
export function objectProjectNorth(object: THREE.Object3D): number {
  const value: unknown = object.userData[PROJECT_NORTH_KEY]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function setObjectProjectNorth(object: THREE.Object3D, radians: number): void {
  object.userData[PROJECT_NORTH_KEY] = radians
}

/** Swaps `object`'s project north for `radians`, keeping its placement turn. */
export function turnObjectToProjectNorth(object: THREE.Object3D, radians: number): void {
  object.rotation.y += radians - objectProjectNorth(object)
  setObjectProjectNorth(object, radians)
  object.updateMatrixWorld(true)
}

/**
 * The project north that turns the plan segment a→b onto the world X axis, by the smaller of the two
 * turns that do, given the model's `current` one. Null for a zero-length segment.
 */
export function projectNorthFromSegment(current: number, a: PlanPointLike, b: PlanPointLike): number | null {
  const dx = b.x - a.x
  const dz = b.z - a.z
  if (dx * dx + dz * dz < 1e-12) return null
  let turn = Math.atan2(dz, dx)
  if (turn > Math.PI / 2) turn -= Math.PI
  else if (turn <= -Math.PI / 2) turn += Math.PI
  return normalizeAngle(current + turn)
}
