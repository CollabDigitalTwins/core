// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { ClippingPlaneInfo } from './ClippingPlanes'

/** With no plane in the scene there is nothing to pick, so the action is not offered. */
export function canPickPlaneForDrawing(planes: ClippingPlaneInfo[]): boolean {
  return planes.length >= 1
}

/** One-based position of a plane in the live list, used to name its drawing. */
export function planeDrawingNumber(planes: ClippingPlaneInfo[], key: string): number {
  const index = planes.findIndex((plane) => plane.key === key)
  return index === -1 ? planes.length + 1 : index + 1
}
