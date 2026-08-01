// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { createModelIdMap, type BimTreeNode } from './bimTree'

import type * as FRAGS from '@thatopen/fragments'

/**
 * Pure transform from the raw fragments spatial structure to `BimTreeNode`s.
 *
 * Kept free of `OBC.Components` so it can be unit-tested against plain fixtures.
 * The raw shape is small and easy to get wrong:
 *
 * ```ts
 * interface SpatialTreeItem { category: string | null; localId: number | null; children?: SpatialTreeItem[] }
 * ```
 *
 * There is **no** `Name` and no `type` — display names have to be fetched
 * separately with `model.getItemsData(ids, { attributes: ['Name'] })` and passed
 * in via `names`. Reading `item.Name.value` (as an earlier version did) silently
 * falls through to the IFC category, which is why the tree used to render
 * `IFCDOOR, IFCDOOR, IFCDOOR…`.
 */

const BUILDING_CATEGORY = 'IFCBUILDING'

/** `localId` is `number | null`, and `0` is a valid id — never test truthiness. */
function hasLocalId(item: FRAGS.SpatialTreeItem): item is FRAGS.SpatialTreeItem & { localId: number } {
  return typeof item.localId === 'number'
}

/** Fragments omits `children` entirely when a node has none. */
function childrenOf(item: FRAGS.SpatialTreeItem): FRAGS.SpatialTreeItem[] {
  return item.children ?? []
}

/**
 * Every `localId` in the structure, so names can be resolved in one batched
 * `getItemsData` call instead of one call per node.
 */
export function collectSpatialLocalIds(root: FRAGS.SpatialTreeItem): number[] {
  const ids: number[] = []
  const visit = (item: FRAGS.SpatialTreeItem) => {
    if (hasLocalId(item)) ids.push(item.localId)
    for (const child of childrenOf(item)) visit(child)
  }
  visit(root)
  return ids
}

/** Every `IFCBUILDING` in the structure, not just the first one. */
function findBuildings(root: FRAGS.SpatialTreeItem): FRAGS.SpatialTreeItem[] {
  const buildings: FRAGS.SpatialTreeItem[] = []
  const visit = (item: FRAGS.SpatialTreeItem) => {
    if (item.category === BUILDING_CATEGORY) {
      buildings.push(item)
      // Buildings do not nest, so there is nothing to gain from descending.
      return
    }
    for (const child of childrenOf(item)) visit(child)
  }
  visit(root)
  return buildings
}

function labelFor(
  item: FRAGS.SpatialTreeItem,
  names: Map<number, string>,
): string {
  if (hasLocalId(item)) {
    const name = names.get(item.localId)
    if (name?.trim()) return name
  }
  if (item.category) return item.category
  return hasLocalId(item) ? `Item ${item.localId}` : 'Unknown'
}

function toNode(
  item: FRAGS.SpatialTreeItem,
  modelId: string,
  names: Map<number, string>,
  parentId: string,
  index: number,
): BimTreeNode {
  // localId keys are unique per model; nodes without one (rare) fall back to
  // their position, which stays unique even among identically named siblings.
  const id = hasLocalId(item)
    ? `${modelId}:${item.localId}`
    : `${parentId}/${index}`

  return {
    id,
    label: labelFor(item, names),
    category: item.category,
    items: hasLocalId(item) ? createModelIdMap(modelId, [item.localId]) : {},
    children: childrenOf(item).map((child, childIndex) =>
      toNode(child, modelId, names, id, childIndex),
    ),
  }
}

/**
 * Builds the sidebar tree for one model, rooted at its building(s).
 *
 * Project and Site are intentionally skipped — the tree starts at
 * `IFCBUILDING` — but `IFCBUILDINGSTOREY` levels are kept, so the hierarchy
 * reads Building > Storey > Space > Element.
 *
 * Returns an empty array when the model has no building (site-only exports,
 * some IFC4x3 infrastructure models); callers should treat that as "nothing to
 * show for this model" rather than an error.
 */
export function buildSpatialTree(
  root: FRAGS.SpatialTreeItem | null | undefined,
  modelId: string,
  names: Map<number, string> = new Map(),
): BimTreeNode[] {
  if (!root) return []
  return findBuildings(root).map((buildingItem, index) =>
    toNode(buildingItem, modelId, names, modelId, index),
  )
}

/**
 * Turns the result of `model.getItemsData(localIds, { attributes: ['Name'] })`
 * into a lookup. `getItemsData` returns one entry per requested id in order, so
 * the two arrays are index-aligned.
 */
export function nameMapFromItemsData(
  localIds: number[],
  itemsData: readonly { Name?: { value?: unknown } }[],
): Map<number, string> {
  const names = new Map<number, string>()
  for (const [index, localId] of localIds.entries()) {
    const value = itemsData[index]?.Name?.value
    if (typeof value === 'string' && value.trim()) {
      names.set(localId, value)
    }
  }
  return names
}
