import * as OBC from '@thatopen/components';
import { type AppearanceOverride, type AppearanceSource, type ElementAppearanceGroup, type NodeAppearance } from './lib/appearanceOverrides';
import type { UndoHistory } from '../../../../utils/undoHistory';
/**
 * Session-scoped colour and opacity overrides for the Layers tab's two
 * classifier trees, with a shared undo stack.
 *
 * A component rather than React state for two reasons: the sidebar unmounts the
 * tab you are not looking at, and CTRL+Z has to work from anywhere in the
 * viewer. Panels read and write through it and re-render off {@link onChanged},
 * the same way visibility is routed through `lib/bimItemActions` and announced by
 * `VisibilityState`.
 *
 * Overrides are deliberately not persisted. They are also not preserved across
 * floorplan and elevation modes — those repaint the whole model — so this
 * reapplies itself whenever the viewer returns to 3D, and whenever the trees
 * rebuild, which is what lets a newly loaded model pick up an existing IFC class
 * colour.
 */
export declare class ElementAppearance extends OBC.Component implements OBC.Disposable {
    static readonly uuid: "d2a5f108-9c47-4b36-8e91-5f7a0c3e64d2";
    enabled: boolean;
    readonly onChanged: OBC.Event<void>;
    /** Required for `dispose()` to run: OBC checks for `dispose` + `onDisposed`. */
    readonly onDisposed: OBC.Event<string>;
    /**
     * Undo/redo steps for colour and opacity only. Visibility, selection and
     * camera are deliberately out: they have their own affordances, and folding
     * them in would make CTRL+Z unpredictable.
     */
    readonly history: UndoHistory;
    private _overrides;
    /** Per-element paint by owner, a plugin id. Outside {@link history}: CTRL+Z is the user's. */
    private _elementOverrides;
    private _seq;
    /**
     * Group the last change belonged to, so a slider drag is one undo step rather
     * than one per tick. Cleared by any change outside the group.
     */
    private _coalescingKey;
    /** What the last pass painted, so the next one can un-paint exactly that. */
    private _touched;
    /** Serialises passes: the resets of one must not interleave with another's. */
    private _applying;
    /** Whether a pass is already waiting, so repeat requests collapse into it. */
    private _applyQueued;
    private _reapplyTimeout;
    private _disposed;
    constructor(components: OBC.Components);
    get overrides(): readonly AppearanceOverride[];
    /** The override on one node, if it has one. */
    overrideFor(source: AppearanceSource, nodeId: string): NodeAppearance | undefined;
    /** Whether one tree has anything to reset. */
    hasOverrides(source: AppearanceSource): boolean;
    /**
     * Sets a colour, an opacity, or both on one node. Merges into whatever that
     * node already carries, so picking a colour does not discard its opacity.
     *
     * `coalesceKey` folds a run of changes into a single undo step. Dragging the
     * opacity slider fires on every tick, and eighteen presses of CTRL+Z to get
     * back across one drag is not undo, it is a punishment. Pass a key that is
     * stable for the drag and different from anything else; the group ends as soon
     * as a change with another key arrives, or when {@link endCoalescing} is called.
     */
    setNodeAppearance(source: AppearanceSource, nodeId: string, change: NodeAppearance, coalesceKey?: string): void;
    /** Closes the current coalescing group, e.g. when a slider is released. */
    endCoalescing(): void;
    /**
     * Paints elements for one owner, replacing that owner's previous paint. Every group in one
     * call: an owner holds one entry, so calling this per group leaves only the last.
     */
    setElementAppearance(owner: string, groups: readonly ElementAppearanceGroup[]): void;
    /** Drops one owner's paint, leaving every other owner's and both trees' alone. */
    clearElementAppearance(owner: string): void;
    /** Drops one node's override, giving its elements back to whatever they inherit. */
    clearNode(source: AppearanceSource, nodeId: string): void;
    /** Resets one tree to default colours, leaving the other tree's work alone. */
    clearSource(source: AppearanceSource): void;
    /**
     * Steps back one colour or opacity change. Resolves false when there is
     * nothing to undo.
     *
     * Thin on purpose — {@link history} is the real thing, so a keyboard hook or a
     * toolbar button can drive it directly.
     */
    undo(): Promise<boolean>;
    /** Re-applies the change that was just undone. */
    redo(): Promise<boolean>;
    /**
     * Applies a new override list and records how to move between it and the old
     * one.
     *
     * Both directions close over a list rather than diffing: the list is a handful
     * of small plain objects, and replaying either way is the same code path as any
     * other change.
     */
    private commit;
    private restore;
    private scheduleReapply;
    /**
     * Forgetting a removed model's painted ids keeps the next pass from resetting
     * highlights on a model that is gone. The overrides themselves are kept, so
     * reloading the same file brings its colours back.
     */
    private onModelRemoved;
    /**
     * Repaints every override from scratch.
     *
     * Passes run one at a time, and at most one waits behind the running pass: a
     * pass reads the override list when it starts, so a queue of them would repaint
     * the same final state over and over. Dragging the opacity slider asks for a
     * repaint on every tick, and each one resets and re-highlights across the
     * model.
     */
    reapply(): Promise<void>;
    /**
     * Recomputes the whole appearance rather than patching it: a removed override
     * has to un-paint elements that an incremental path would leave coloured.
     */
    private applyPass;
    private nodesBySource;
    dispose(): void;
}
//# sourceMappingURL=ElementAppearance.d.ts.map