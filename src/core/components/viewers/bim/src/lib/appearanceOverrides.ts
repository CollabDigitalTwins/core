// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { subtreeItems, type BimTreeNode } from './bimTree'

/** Which sidebar tree an override was made from. */
export type AppearanceSource = 'spatial' | 'ifc-class'

/** A colour and/or opacity override. Either half may be absent. */
export interface NodeAppearance {
  /** `0xRRGGBB`. Absent means "keep the element's own colour". */
  color?: number
  /** `0`-`1`. Absent means "keep the element fully opaque". */
  opacity?: number
}

export interface AppearanceOverride extends NodeAppearance {
  source: AppearanceSource
  /** `BimTreeNode.id`, stable across tree rebuilds and search filtering. */
  nodeId: string
  /**
   * Monotonic write counter. Orders the two trees against each other and breaks
   * depth ties within one; see {@link resolveAppearance}.
   */
  seq: number
}

/** `modelId` → `localId` → the appearance that element ends up with. */
export type ResolvedAppearance = Map<string, Map<number, NodeAppearance>>

/**
 * Appearances addressed by element rather than by tree node, keyed by whoever set them.
 *
 * A plugin paints specific elements — the IfcSpaces it found — and has no tree node to hang
 * an override on. Keyed by owner so two plugins painting the same model do not clobber one
 * another, and so one can be cleared without touching the other.
 */
export type ElementAppearanceOverrides = Map<string, ResolvedAppearance>

/** One `model.highlight()` call's worth of work. */
export interface AppearanceBucket {
  modelId: string
  localIds: number[]
  appearance: NodeAppearance
}

interface IndexedNode {
  node: BimTreeNode
  depth: number
}

function indexNodes(roots: BimTreeNode[]): Map<string, IndexedNode> {
  const index = new Map<string, IndexedNode>()
  const visit = (node: BimTreeNode, depth: number): void => {
    index.set(node.id, { node, depth })
    for (const child of node.children) visit(child, depth + 1)
  }
  for (const root of roots) visit(root, 0)
  return index
}

/**
 * Flattens the overrides of both trees into a per-element appearance map.
 *
 * Two ordering rules meet here, and they want different things:
 *
 * - **Within one tree**, a node's override cascades to its whole subtree, but a
 *   descendant that carries its own override keeps it. So the spatial tree is
 *   replayed shallowest-first and later writes win — colouring a storey tints
 *   everything in it, and the one wall you coloured separately stays as it was,
 *   whichever order the two were set in.
 * - **Between the trees**, there is no containment to appeal to: `IFCWALL` and a
 *   storey simply overlap. Recency decides, so the tree the user touched most
 *   recently wins the overlap, and undoing that hands the elements back.
 *
 * Hence the sort: trees ordered by their most recent write, nodes within a tree
 * by depth. A half-override merges over what it inherits rather than replacing
 * it, so fading a wall inside a red storey leaves the wall red *and* faded.
 *
 * Overrides naming a node that is no longer in the tree (its model was unloaded)
 * are skipped rather than dropped — reloading the file brings them back.
 */
export function resolveAppearance(
  overrides: readonly AppearanceOverride[],
  nodesBySource: Record<AppearanceSource, BimTreeNode[]>,
  elementOverrides?: ElementAppearanceOverrides,
): ResolvedAppearance {
  const indexes: Record<AppearanceSource, Map<string, IndexedNode>> = {
    'spatial': indexNodes(nodesBySource.spatial),
    'ifc-class': indexNodes(nodesBySource['ifc-class']),
  }

  const live = overrides.filter(o => indexes[o.source].has(o.nodeId))
  // Not an early return when there are element overrides: a plugin can be the only thing
  // painting, with both sidebar trees untouched.
  if (live.length === 0) return applyElementOverrides(new Map(), elementOverrides)

  const lastSeq = new Map<AppearanceSource, number>()
  for (const o of live) {
    lastSeq.set(o.source, Math.max(lastSeq.get(o.source) ?? -1, o.seq))
  }

  const ordered = [...live].sort((a, b) => {
    if (a.source !== b.source) {
      return (lastSeq.get(a.source) ?? -1) - (lastSeq.get(b.source) ?? -1)
    }
    const depthDelta =
      (indexes[a.source].get(a.nodeId)?.depth ?? 0) -
      (indexes[b.source].get(b.nodeId)?.depth ?? 0)
    return depthDelta !== 0 ? depthDelta : a.seq - b.seq
  })

  const resolved: ResolvedAppearance = new Map()
  for (const override of ordered) {
    const indexed = indexes[override.source].get(override.nodeId)
    if (!indexed) continue

    const items = subtreeItems(indexed.node)
    for (const modelId of Object.keys(items)) {
      let perModel = resolved.get(modelId)
      if (!perModel) {
        perModel = new Map()
        resolved.set(modelId, perModel)
      }
      for (const localId of items[modelId]) {
        const inherited = perModel.get(localId)
        perModel.set(localId, {
          ...inherited,
          ...(override.color !== undefined && { color: override.color }),
          ...(override.opacity !== undefined && { opacity: override.opacity }),
        })
      }
    }
  }

  return applyElementOverrides(resolved, elementOverrides)
}

/**
 * Lays per-element overrides over the tree-resolved result.
 *
 * Applied last, so a plugin painting spaces by programme wins over a storey tinted from the
 * sidebar. That is the point of a thematic overlay, and the user can always switch the
 * plugin off; the reverse — a tree cascade quietly repainting what a plugin just set — would
 * leave the plugin's own legend lying about what is on screen.
 */
function applyElementOverrides(
  resolved: ResolvedAppearance,
  elementOverrides: ElementAppearanceOverrides | undefined,
): ResolvedAppearance {
  if (!elementOverrides || elementOverrides.size === 0) return resolved

  for (const perOwner of elementOverrides.values()) {
    for (const [modelId, perModel] of perOwner) {
      let target = resolved.get(modelId)
      if (!target) {
        target = new Map()
        resolved.set(modelId, target)
      }
      for (const [localId, appearance] of perModel) {
        target.set(localId, { ...target.get(localId), ...appearance })
      }
    }
  }

  return resolved
}

/**
 * Groups elements by identical appearance, one bucket per `model.highlight()`
 * call.
 *
 * Fragments keeps an append-only list of highlight material definitions indexed
 * by a `Uint16`, and only deduplicates definitions by content. Painting per
 * element would burn a slot per element out of ~65 500 for the model's lifetime;
 * painting per distinct appearance costs one slot each, however many elements
 * carry it.
 */
export function bucketByAppearance(resolved: ResolvedAppearance): AppearanceBucket[] {
  const buckets = new Map<string, AppearanceBucket>()

  for (const [modelId, perModel] of resolved) {
    for (const [localId, appearance] of perModel) {
      if (appearance.color === undefined && appearance.opacity === undefined) continue

      const key = `${modelId}|${appearance.color ?? ''}|${appearance.opacity ?? ''}`
      const existing = buckets.get(key)
      if (existing) {
        existing.localIds.push(localId)
      } else {
        buckets.set(key, { modelId, localIds: [localId], appearance: { ...appearance } })
      }
    }
  }

  return [...buckets.values()]
}

/** Every element the resolved map paints, per model. Used to scope the reset. */
export function touchedIdsByModel(resolved: ResolvedAppearance): Map<string, number[]> {
  const touched = new Map<string, number[]>()
  for (const [modelId, perModel] of resolved) {
    const ids = [...perModel.keys()]
    if (ids.length > 0) touched.set(modelId, ids)
  }
  return touched
}

/**
 * Adds or updates the override for one node, merging into any existing record so
 * setting a colour does not drop the opacity already on it.
 *
 * Returns a new list; one record per (source, node), moved to the end so it
 * counts as the tree's most recent write.
 */
export function upsertOverride(
  overrides: readonly AppearanceOverride[],
  source: AppearanceSource,
  nodeId: string,
  change: NodeAppearance,
  seq: number,
): AppearanceOverride[] {
  const existing = overrides.find(o => o.source === source && o.nodeId === nodeId)
  const next: AppearanceOverride = {
    ...existing,
    ...change,
    source,
    nodeId,
    seq,
  }
  return [...overrides.filter(o => o !== existing), next]
}

export function removeOverride(
  overrides: readonly AppearanceOverride[],
  source: AppearanceSource,
  nodeId: string,
): AppearanceOverride[] {
  return overrides.filter(o => !(o.source === source && o.nodeId === nodeId))
}

export function clearSourceOverrides(
  overrides: readonly AppearanceOverride[],
  source: AppearanceSource,
): AppearanceOverride[] {
  return overrides.filter(o => o.source !== source)
}

export function findOverride(
  overrides: readonly AppearanceOverride[],
  source: AppearanceSource,
  nodeId: string,
): AppearanceOverride | undefined {
  return overrides.find(o => o.source === source && o.nodeId === nodeId)
}
