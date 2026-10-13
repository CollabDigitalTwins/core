// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Ring } from '../../../MapLayers/src/SiteLayer/siteGeometry'

/** A corner or click position in screen pixels. */
export interface ScreenPoint {
  x: number
  y: number
}

/** Index of the corner within `threshold` pixels of `target`, closest first, or -1. */
export function nearestCornerIndex(corners: ScreenPoint[], target: ScreenPoint, threshold: number): number {
  let best = -1
  let bestDistance = threshold
  corners.forEach((corner, index) => {
    const distance = Math.hypot(corner.x - target.x, corner.y - target.y)
    if (distance <= bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return best
}

function distanceToSegment(point: ScreenPoint, a: ScreenPoint, b: ScreenPoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

/** Index of the edge starting at that corner within `threshold` pixels of `target`, or -1; the closing edge counts once there are 3 corners. */
export function nearestEdgeIndex(corners: ScreenPoint[], target: ScreenPoint, threshold: number): number {
  const edgeCount = corners.length >= 3 ? corners.length : corners.length - 1
  let best = -1
  let bestDistance = threshold
  for (let index = 0; index < edgeCount; index++) {
    const distance = distanceToSegment(target, corners[index], corners[(index + 1) % corners.length])
    if (distance <= bestDistance) {
      best = index
      bestDistance = distance
    }
  }
  return best
}

export const insertCorner = (ring: Ring, afterIndex: number, corner: [number, number]): Ring =>
  [...ring.slice(0, afterIndex + 1), corner, ...ring.slice(afterIndex + 1)]

export const removeCorner = (ring: Ring, index: number): Ring =>
  ring.filter((_, i) => i !== index)

export const moveCorner = (ring: Ring, index: number, corner: [number, number]): Ring =>
  ring.map((existing, i) => (i === index ? corner : existing))
