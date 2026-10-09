// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { planDistance } from './planPointer'

import type { PlanPoint } from './planPointer'

const WELD_PRECISION = 1000
const COLLINEAR_EPSILON = 1e-6

interface Welded {
  key: string
  point: PlanPoint
}

function weld(x: number, z: number): Welded {
  const kx = Math.round(x * WELD_PRECISION)
  const kz = Math.round(z * WELD_PRECISION)
  return { key: `${kx},${kz}`, point: { x: kx / WELD_PRECISION, z: kz / WELD_PRECISION } }
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** Plan area of flat `[x, y, z, …]` triangles, ignoring `y`. */
export function trianglesArea(triangles: readonly number[]): number {
  let area = 0
  for (let i = 0; i + 8 < triangles.length; i += 9) {
    const ax = triangles[i]
    const az = triangles[i + 2]
    const bx = triangles[i + 3]
    const bz = triangles[i + 5]
    const cx = triangles[i + 6]
    const cz = triangles[i + 8]
    area += Math.abs((bx - ax) * (cz - az) - (cx - ax) * (bz - az)) / 2
  }
  return area
}

function boundaryEdges(triangles: readonly number[], points: Map<string, PlanPoint>): Array<[string, string]> {
  const counts = new Map<string, { a: string; b: string; count: number }>()
  for (let i = 0; i + 8 < triangles.length; i += 9) {
    const corners = [0, 3, 6].map(offset => weld(triangles[i + offset], triangles[i + offset + 2]))
    for (const corner of corners) points.set(corner.key, corner.point)
    for (let side = 0; side < 3; side++) {
      const a = corners[side].key
      const b = corners[(side + 1) % 3].key
      if (a === b) continue
      const key = edgeKey(a, b)
      const edge = counts.get(key)
      if (edge) edge.count++
      else counts.set(key, { a, b, count: 1 })
    }
  }
  return [...counts.values()].filter(edge => edge.count === 1).map(edge => [edge.a, edge.b])
}

function walkLoops(edges: Array<[string, string]>): string[][] {
  const neighbours = new Map<string, string[]>()
  for (const [a, b] of edges) {
    neighbours.set(a, [...(neighbours.get(a) ?? []), b])
    neighbours.set(b, [...(neighbours.get(b) ?? []), a])
  }
  const used = new Set<string>()
  const loops: string[][] = []
  for (const [start, end] of edges) {
    if (used.has(edgeKey(start, end))) continue
    const loop = [start]
    let previous = start
    let current = end
    used.add(edgeKey(start, end))
    while (current !== start) {
      loop.push(current)
      const next = (neighbours.get(current) ?? []).find(candidate => candidate !== previous && !used.has(edgeKey(current, candidate)))
      if (!next) break
      used.add(edgeKey(current, next))
      previous = current
      current = next
    }
    if (loop.length >= 3) loops.push(loop)
  }
  return loops
}

function perimeter(loop: PlanPoint[]): number {
  return loop.reduce((sum, point, i) => sum + planDistance(point, loop[(i + 1) % loop.length]), 0)
}

function dropCollinear(loop: PlanPoint[]): PlanPoint[] {
  return loop.filter((point, i) => {
    const prev = loop[(i - 1 + loop.length) % loop.length]
    const next = loop[(i + 1) % loop.length]
    const cross = (point.x - prev.x) * (next.z - prev.z) - (point.z - prev.z) * (next.x - prev.x)
    return Math.abs(cross) > COLLINEAR_EPSILON
  })
}

/** The outer boundary of a flat triangle soup, as one closed polygon without its repeated first point. */
export function outlineFromTriangles(triangles: readonly number[]): PlanPoint[] {
  const points = new Map<string, PlanPoint>()
  const loops = walkLoops(boundaryEdges(triangles, points))
    .map(loop => loop.map(key => points.get(key)!))
  if (loops.length === 0) return []
  const outer = loops.reduce((best, loop) => (perimeter(loop) > perimeter(best) ? loop : best))
  return dropCollinear(outer)
}
