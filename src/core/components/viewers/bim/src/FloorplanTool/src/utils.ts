// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { FLOORPLAN_FILL_CATEGORIES } from './types'

import type * as FRAGS from '@thatopen/fragments'

const SPACE = 'IFCSPACE'
const STOREY = 'IFCBUILDINGSTOREY'

function findSpatialNode(item: FRAGS.SpatialTreeItem, localId: number): FRAGS.SpatialTreeItem | null {
  if (item.localId === localId) return item
  for (const child of item.children ?? []) {
    const found = findSpatialNode(child, localId)
    if (found) return found
  }
  return null
}

/** Element ids under a storey node, including those placed in its spaces, leaving out the spaces and any nested storey. */
export function storeyContentIds(root: FRAGS.SpatialTreeItem, storeyLocalId: number): number[] {
  const storey = findSpatialNode(root, storeyLocalId)
  if (!storey) return []
  const ids: number[] = []
  const visit = (item: FRAGS.SpatialTreeItem) => {
    if (item.category === STOREY) return
    if (typeof item.localId === 'number' && item.category !== SPACE) ids.push(item.localId)
    for (const child of item.children ?? []) visit(child)
  }
  for (const child of storey.children ?? []) visit(child)
  return ids
}

/** Items contained in the storey, or [] when the structure is unavailable and the caller should use every item. */
export async function getStoreyItemIds(
  model: any,
  storeyLocalId: number,
): Promise<number[]> {
  try {
    const root: FRAGS.SpatialTreeItem | null = await model.getSpatialStructure()
    return root ? storeyContentIds(root, storeyLocalId) : []
  } catch {
    return []
  }
}

const FLOOR_BIN = 0.05

/** The most common base height of a storey's walls and columns, which is where its floor sits. */
export function storeyFloorY(bottoms: readonly number[]): number | null {
  if (bottoms.length === 0) return null
  const counts = new Map<number, number>()
  for (const y of bottoms) {
    const bin = Math.round(y / FLOOR_BIN)
    counts.set(bin, (counts.get(bin) ?? 0) + 1)
  }
  let best = 0
  let bestCount = -1
  for (const [bin, count] of counts) {
    if (count > bestCount || (count === bestCount && bin < best)) {
      best = bin
      bestCount = count
    }
  }
  return best * FLOOR_BIN
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Storey spacing beyond this in the raw attribute only makes sense in millimetres. */
const MILLIMETRE_SPREAD = 200

/** World elevations from IFC storey attributes, shifted onto the geometry; null when no storey has a floor to anchor to. */
export function anchorStoreyElevations(
  storeys: readonly { rawElevation: number; floorY: number | null }[],
): number[] | null {
  const raws = storeys.map(s => s.rawElevation)
  const spread = Math.max(...raws) - Math.min(...raws)
  const toMetres = spread > MILLIMETRE_SPREAD ? 0.001 : 1
  const offsets = storeys.flatMap(s => (s.floorY === null ? [] : [s.floorY - s.rawElevation * toMetres]))
  if (offsets.length === 0) return null
  const offset = median(offsets)
  return storeys.map(s => s.rawElevation * toMetres + offset)
}

export function normalizeElevation(
  raw: number,
  coordHeight: number,
  minY: number,
  maxY: number,
): number {
  let elevation = raw

  if (elevation > maxY + 200 || elevation < minY - 200) {
    const inMeters = elevation / 1000
    if (inMeters > minY - 50 && inMeters < maxY + 50) {
      elevation = inMeters
    }
  }

  const elevWithCoord = elevation + coordHeight
  const inBoundsRaw = elevation >= minY - 10 && elevation <= maxY + 10
  const inBoundsCoord =
    elevWithCoord >= minY - 10 && elevWithCoord <= maxY + 10

  if (inBoundsCoord && !inBoundsRaw) return elevWithCoord
  if (inBoundsRaw && !inBoundsCoord) return elevation
  return elevWithCoord
}

/** Height of the plan's section cut above a storey's floor, in metres. */
export const STOREY_CUT_HEIGHT = 1.5

// How far below the floor the plan still captures; anything hanging lower belongs to the ceiling beneath.
const FLOOR_TOLERANCE = 0.1

/** Depth the plan captures below its section cut, in metres. */
export const STOREY_CUT_DEPTH = STOREY_CUT_HEIGHT + FLOOR_TOLERANCE

/** World Y of a storey's section cut — the drawing plane and the upper clip. */
export function storeyCutPlaneY(elevation: number): number {
  return elevation + STOREY_CUT_HEIGHT
}

/** World Y where a storey's cut volume bottoms out — the lower clip plane. */
export function storeyLowerClipY(elevation: number): number {
  return storeyCutPlaneY(elevation) - STOREY_CUT_DEPTH
}

/** Classes that draw plan lines: floors only hide what lies beneath them, and spaces, drawn by their overlay, would bury their contents. */
export function planLineClasses(byClass: ReadonlyMap<string, number[]>): Map<string, number[]> {
  const kept = new Map<string, number[]>()
  for (const [className, ids] of byClass) {
    if (className === SPACE || FLOORPLAN_FILL_CATEGORIES.some(category => category.test(className))) continue
    kept.set(className, ids)
  }
  return kept
}
