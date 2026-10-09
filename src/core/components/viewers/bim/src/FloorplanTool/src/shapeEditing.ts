// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { closestOnSegment } from './planPointer'

import type { PlanPoint } from './planPointer'

export interface EdgeHit {
  /** The edge runs from `points[index]` to `points[(index + 1) % length]`. */
  index: number
  point: PlanPoint
}

const MIN_CORNERS = 3

export function nearestVertexIndex(points: readonly PlanPoint[], at: PlanPoint, radius: number): number | null {
  let best: number | null = null
  let bestDistance = radius * radius
  for (const [index, point] of points.entries()) {
    const distance = (point.x - at.x) ** 2 + (point.z - at.z) ** 2
    if (distance > bestDistance) continue
    bestDistance = distance
    best = index
  }
  return best
}

export function nearestEdge(points: readonly PlanPoint[], at: PlanPoint, radius: number): EdgeHit | null {
  let best: EdgeHit | null = null
  let bestDistance = radius * radius
  for (const [index, a] of points.entries()) {
    const point = closestOnSegment(a, points[(index + 1) % points.length], at)
    const distance = (point.x - at.x) ** 2 + (point.z - at.z) ** 2
    if (distance > bestDistance) continue
    bestDistance = distance
    best = { index, point }
  }
  return best
}

/** Even-odd test, so it holds for concave outlines too. */
export function containsPoint(points: readonly PlanPoint[], at: PlanPoint): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]
    const b = points[j]
    const crosses = (a.z > at.z) !== (b.z > at.z) && at.x < ((b.x - a.x) * (at.z - a.z)) / (b.z - a.z) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

export function moveVertex(points: readonly PlanPoint[], index: number, to: PlanPoint): PlanPoint[] {
  return points.map((point, i) => (i === index ? { ...to } : point))
}

/** Translates both ends of an edge by `by`, keeping its length and direction. */
export function moveEdge(points: readonly PlanPoint[], index: number, by: PlanPoint): PlanPoint[] {
  const next = (index + 1) % points.length
  return points.map((point, i) => (i === index || i === next ? { x: point.x + by.x, z: point.z + by.z } : point))
}

export function insertVertex(points: readonly PlanPoint[], afterIndex: number, at: PlanPoint): PlanPoint[] {
  return [...points.slice(0, afterIndex + 1), { ...at }, ...points.slice(afterIndex + 1)]
}

/** Leaves a triangle alone: an outline needs three corners. */
export function removeVertex(points: readonly PlanPoint[], index: number): PlanPoint[] {
  if (points.length <= MIN_CORNERS) return [...points]
  return points.filter((_, i) => i !== index)
}
