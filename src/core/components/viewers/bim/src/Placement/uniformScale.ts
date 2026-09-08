// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

const MIN_SCALE = 1e-6

/**
 * The single scale a proportional drag meant. The gizmo writes only the axis being dragged, so
 * the odd component out of three that started equal is the one the user moved.
 */
export function uniformScale(x: number, y: number, z: number): number {
  const dragged = x === y ? z : x === z ? y : y === z ? x : z
  return Number.isFinite(dragged) && dragged > MIN_SCALE ? dragged : 1
}
