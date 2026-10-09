// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** A point on a horizontal plan, in world metres: `x` east, `z` south. */
export interface PlanPoint {
  x: number
  z: number
}

export type SnapKind = 'vertex' | 'edge'

export interface PlanSnap {
  point: PlanPoint
  kind: SnapKind
}

interface Vec3Like {
  x: number
  y: number
  z: number
}

interface OrthoLike {
  isOrthographicCamera?: boolean
  left: number
  right: number
  zoom?: number
}

const SNAP_PX = 12
const FALLBACK_SNAP_RADIUS = 0.5

/** Where a ray meets the horizontal plane `y = planeY`, or null when it runs parallel. */
export function rayToPlaneY(origin: Vec3Like, direction: Vec3Like, planeY: number): PlanPoint | null {
  if (Math.abs(direction.y) < 1e-9) return null
  const t = (planeY - origin.y) / direction.y
  if (!Number.isFinite(t)) return null
  return { x: origin.x + direction.x * t, z: origin.z + direction.z * t }
}

/** World metres one canvas pixel covers at the ortho camera's zoom, or null for any other camera. */
export function worldPerPixel(camera: OrthoLike | null | undefined, canvasWidth: number): number | null {
  if (!camera?.isOrthographicCamera) return null
  return (camera.right - camera.left) / (camera.zoom || 1) / Math.max(1, canvasWidth) || null
}

/** A ~12 px tolerance in world units at the ortho camera's current zoom. */
export function snapRadius(camera: OrthoLike | null | undefined, canvasWidth: number): number {
  const perPixel = worldPerPixel(camera, canvasWidth)
  return perPixel ? perPixel * SNAP_PX : FALLBACK_SNAP_RADIUS
}

/**
 * The nearest corner of `segments` (`[x0, z0, x1, z1, …]`) or `corners` within `radius`,
 * else the nearest point on a segment within it, else null.
 */
export function snapToLines(
  segments: Float32Array | null,
  corners: readonly PlanPoint[],
  point: PlanPoint,
  radius: number,
): PlanSnap | null {
  const vertex = nearestCorner(segments, corners, point, radius)
  if (vertex) return { point: vertex, kind: 'vertex' }
  const edge = segments ? nearestOnSegments(segments, point, radius) : null
  return edge ? { point: edge, kind: 'edge' } : null
}

function nearestCorner(
  segments: Float32Array | null,
  corners: readonly PlanPoint[],
  point: PlanPoint,
  radius: number,
): PlanPoint | null {
  let best: PlanPoint | null = null
  let bestDistance = radius * radius
  const consider = (x: number, z: number) => {
    const distance = (x - point.x) ** 2 + (z - point.z) ** 2
    if (distance >= bestDistance) return
    bestDistance = distance
    best = { x, z }
  }
  if (segments) for (let i = 0; i + 1 < segments.length; i += 2) consider(segments[i], segments[i + 1])
  for (const corner of corners) consider(corner.x, corner.z)
  return best
}

function nearestOnSegments(segments: Float32Array, point: PlanPoint, radius: number): PlanPoint | null {
  let best: PlanPoint | null = null
  let bestDistance = radius * radius
  for (let i = 0; i + 3 < segments.length; i += 4) {
    const a = { x: segments[i], z: segments[i + 1] }
    const b = { x: segments[i + 2], z: segments[i + 3] }
    const candidate = closestOnSegment(a, b, point)
    const distance = (candidate.x - point.x) ** 2 + (candidate.z - point.z) ** 2
    if (distance >= bestDistance) continue
    bestDistance = distance
    best = candidate
  }
  return best
}

export function closestOnSegment(a: PlanPoint, b: PlanPoint, at: PlanPoint): PlanPoint {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const lengthSq = dx * dx + dz * dz
  const t = lengthSq > 0 ? Math.min(1, Math.max(0, ((at.x - a.x) * dx + (at.z - a.z) * dz) / lengthSq)) : 0
  return { x: a.x + dx * t, z: a.z + dz * t }
}

/** The four corners of the axis-aligned rectangle spanned by two opposite corners. */
export function rectangleCorners(a: PlanPoint, b: PlanPoint): PlanPoint[] {
  return [
    { x: a.x, z: a.z },
    { x: b.x, z: a.z },
    { x: b.x, z: b.z },
    { x: a.x, z: b.z },
  ]
}

export function planDistance(a: PlanPoint, b: PlanPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}
