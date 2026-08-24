import { type BimTreeNode } from './bimTree';
/** Which sidebar tree an override was made from. */
export type AppearanceSource = 'spatial' | 'ifc-class';
/** A colour and/or opacity override. Either half may be absent. */
export interface NodeAppearance {
    /** `0xRRGGBB`. Absent means "keep the element's own colour". */
    color?: number;
    /** `0`-`1`. Absent means "keep the element fully opaque". */
    opacity?: number;
}
export interface AppearanceOverride extends NodeAppearance {
    source: AppearanceSource;
    /** `BimTreeNode.id`, stable across tree rebuilds and search filtering. */
    nodeId: string;
    /**
     * Monotonic write counter. Orders the two trees against each other and breaks
     * depth ties within one; see {@link resolveAppearance}.
     */
    seq: number;
}
/** `modelId` → `localId` → the appearance that element ends up with. */
export type ResolvedAppearance = Map<string, Map<number, NodeAppearance>>;
/**
 * Appearances addressed by element rather than tree node, keyed by owner so two plugins
 * painting the same model cannot clobber each other.
 */
export type ElementAppearanceOverrides = Map<string, ResolvedAppearance>;
/** One appearance and the elements wearing it. Several of these make up one owner's paint. */
export interface ElementAppearanceGroup {
    /** `modelId` → local ids. Sets in practice, since that is what `ModelIdMap` holds. */
    items: Record<string, Iterable<number>>;
    appearance: NodeAppearance;
}
/** One `model.highlight()` call's worth of work. */
export interface AppearanceBucket {
    modelId: string;
    localIds: number[];
    appearance: NodeAppearance;
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
export declare function resolveAppearance(overrides: readonly AppearanceOverride[], nodesBySource: Record<AppearanceSource, BimTreeNode[]>, elementOverrides?: ElementAppearanceOverrides): ResolvedAppearance;
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
export declare function bucketByAppearance(resolved: ResolvedAppearance): AppearanceBucket[];
/** Every element the resolved map paints, per model. Used to scope the reset. */
export declare function touchedIdsByModel(resolved: ResolvedAppearance): Map<string, number[]>;
/**
 * Adds or updates the override for one node, merging into any existing record so
 * setting a colour does not drop the opacity already on it.
 *
 * Returns a new list; one record per (source, node), moved to the end so it
 * counts as the tree's most recent write.
 */
export declare function upsertOverride(overrides: readonly AppearanceOverride[], source: AppearanceSource, nodeId: string, change: NodeAppearance, seq: number): AppearanceOverride[];
export declare function removeOverride(overrides: readonly AppearanceOverride[], source: AppearanceSource, nodeId: string): AppearanceOverride[];
export declare function clearSourceOverrides(overrides: readonly AppearanceOverride[], source: AppearanceSource): AppearanceOverride[];
export declare function findOverride(overrides: readonly AppearanceOverride[], source: AppearanceSource, nodeId: string): AppearanceOverride | undefined;
//# sourceMappingURL=appearanceOverrides.d.ts.map