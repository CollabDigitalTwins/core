// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { ModelIdMap } from '@thatopen/components'

export type { ModelIdMap }

/**
 * A node in one of the BIM viewer's sidebar trees.
 *
 * Both the spatial structure tree and the IFC class tree produce this shape, so
 * `BimTreeView` renders them and `useBimTreeControls` drives them with the same
 * code. `items` is what the node *itself* stands for; use `subtreeItems` when
 * an action should also cover the node's descendants.
 */
export interface BimTreeNode {
  /** Stable and unique within one tree. Used as the React key and the expand-state key. */
  id: string
  /** Display label. IFC class names are kept verbatim (IFCWALL), never translated. */
  label: string
  /** IFC category of the node itself, rendered as a muted suffix. */
  category?: string | null
  /** Elements this node directly represents, keyed by model. */
  items: ModelIdMap
  /** Optional element count shown at the end of the row (the IFC class tree uses it). */
  count?: number
  children: BimTreeNode[]
}

/** How much of a node's subtree is currently hidden in the 3D view. */
export type NodeVisibility = 'visible' | 'hidden' | 'partial'

export function createModelIdMap(
  modelId: string,
  localIds: Iterable<number>,
): ModelIdMap {
  return { [modelId]: new Set(localIds) }
}

/** Merges `source` into `target` in place and returns `target`. */
export function mergeModelIdMap(target: ModelIdMap, source: ModelIdMap): ModelIdMap {
  for (const modelId of Object.keys(source)) {
    const existing = target[modelId]
    if (existing) {
      for (const localId of source[modelId]) existing.add(localId)
    } else {
      target[modelId] = new Set(source[modelId])
    }
  }
  return target
}

export function modelIdMapSize(map: ModelIdMap): number {
  let total = 0
  for (const modelId of Object.keys(map)) total += map[modelId].size
  return total
}

export function isModelIdMapEmpty(map: ModelIdMap): boolean {
  for (const modelId of Object.keys(map)) {
    if (map[modelId].size > 0) return false
  }
  return true
}

/**
 * Cache keyed by node identity. Trees are rebuilt as fresh objects whenever
 * their data changes, so entries can never go stale — the old nodes are simply
 * collected along with their cache slots.
 */
const subtreeCache = new WeakMap<BimTreeNode, ModelIdMap>()

/** The node's own items plus every descendant's, memoised per node. */
export function subtreeItems(node: BimTreeNode): ModelIdMap {
  const cached = subtreeCache.get(node)
  if (cached) return cached

  const result: ModelIdMap = {}
  mergeModelIdMap(result, node.items)
  for (const child of node.children) {
    mergeModelIdMap(result, subtreeItems(child))
  }

  subtreeCache.set(node, result)
  return result
}

/** Union of `subtreeItems` across several roots. */
export function collectItems(nodes: BimTreeNode[]): ModelIdMap {
  const result: ModelIdMap = {}
  for (const node of nodes) mergeModelIdMap(result, subtreeItems(node))
  return result
}

export function allNodeIds(nodes: BimTreeNode[]): string[] {
  const ids: string[] = []
  const visit = (node: BimTreeNode) => {
    ids.push(node.id)
    for (const child of node.children) visit(child)
  }
  for (const node of nodes) visit(node)
  return ids
}

/**
 * Visibility state cache, keyed first by the hidden map (a fresh object on every
 * refresh, so a new scene state invalidates the whole table at once) and then by
 * node. Without it, a large storey would be re-walked once per rendered row.
 */
const visibilityCache = new WeakMap<ModelIdMap, WeakMap<BimTreeNode, NodeVisibility>>()

/**
 * Whether the node's subtree is fully visible, fully hidden, or somewhere in
 * between. Derived from the live scene rather than from a local mirror, so it
 * stays correct when something else (floorplan mode, the selection toolbar)
 * changes visibility behind the tree's back.
 */
export function nodeVisibility(node: BimTreeNode, hidden: ModelIdMap): NodeVisibility {
  let perNode = visibilityCache.get(hidden)
  if (!perNode) {
    perNode = new WeakMap()
    visibilityCache.set(hidden, perNode)
  }
  const cached = perNode.get(node)
  if (cached) return cached

  const items = subtreeItems(node)
  let total = 0
  let hiddenCount = 0
  for (const modelId of Object.keys(items)) {
    const hiddenInModel = hidden[modelId]
    for (const localId of items[modelId]) {
      total += 1
      if (hiddenInModel?.has(localId)) hiddenCount += 1
    }
  }

  let state: NodeVisibility = 'visible'
  if (total > 0 && hiddenCount === total) state = 'hidden'
  else if (hiddenCount > 0) state = 'partial'

  perNode.set(node, state)
  return state
}

export interface FilteredTree {
  nodes: BimTreeNode[]
  /**
   * Every node that must be expanded for the matches to be reachable — the full
   * ancestor chain, not just each match's immediate parent.
   */
  expandIds: Set<string>
}

/**
 * Filters the tree to nodes matching `query` and the branches leading to them.
 *
 * A single pass produces both the filtered tree and the ancestor chain to
 * expand; callers should not re-walk the tree to work out what to open.
 */
export function filterTree(nodes: BimTreeNode[], query: string): FilteredTree {
  const needle = query.trim().toLowerCase()
  if (!needle) return { nodes, expandIds: new Set() }

  const expandIds = new Set<string>()

  const visit = (node: BimTreeNode): BimTreeNode | null => {
    const matches = node.label.toLowerCase().includes(needle)

    const children: BimTreeNode[] = []
    let pruned = false
    for (const child of node.children) {
      const kept = visit(child)
      if (kept) children.push(kept)
      if (kept !== child) pruned = true
    }

    // A node is reachable if it matched, or if something below it did.
    const matchedBelow = children.length > 0
    if (!(matches || matchedBelow)) return null

    // Expand ancestors of a match, but not a match's own subtree — searching for
    // a storey should reveal the storey, not dump every element inside it.
    if (matchedBelow) expandIds.add(node.id)

    // A node that matched keeps its full contents, so the user can drill into
    // the hit. Only nodes kept purely as a path to a match get pruned.
    if (matches || !pruned) return node

    // Pruned nodes keep the *unfiltered* subtree in `items`, so hiding or
    // isolating a branch while a search is active still acts on the whole
    // branch rather than only on the rows the search left visible.
    return { ...node, items: subtreeItems(node), children }
  }

  const result: BimTreeNode[] = []
  for (const node of nodes) {
    const kept = visit(node)
    if (kept) result.push(kept)
  }

  return { nodes: result, expandIds }
}
