import * as OBC from '@thatopen/components';
import { type BimTreeNode } from './lib/bimTree';
/** Classification name used in `OBC.Classifier.list`. */
export declare const IFC_CLASS_CLASSIFICATION = "Categories";
/**
 * IFC classes hidden the first time a model brings them in.
 *
 * Mostly topography: exported terrain envelops the building and hides
 * everything behind it. Which class it lands in depends on the schema and the
 * authoring software's export mapping, so this covers both common outcomes.
 * Spaces get the same treatment — they are volumetric and obscure the elements
 * inside them.
 *
 * These classes still appear in the class list with their switch off, so
 * turning one back on is a single click.
 *
 * `IFCBUILDINGELEMENTPROXY` is deliberately **not** here. IFC2x3 exports can put
 * terrain in it, but it is also the catch-all for any element the authoring
 * software has no specific IFC class for, so hiding it by default would take
 * real building geometry with it.
 *
 * TODO: replace with a per-organization list stored in the database, so users
 * can configure this and have it persist.
 */
export declare const DEFAULT_HIDDEN_IFC_CLASSES: readonly string[];
/**
 * Groups every loaded model's elements by IFC class (IFCWALL, IFCSLAB, …) for
 * the sidebar, on top of `OBC.Classifier`.
 *
 * `Classifier.byCategory()` registers one *query-backed* group per category
 * found via `ItemsFinder.addFromCategories()`, which means:
 *
 * - Groups resolve live, so a model loaded later is picked up by the existing
 *   queries without re-classifying anything.
 * - Only categories that actually have geometry are listed, so the panel does
 *   not fill up with property sets and other non-visual entities.
 *
 * Class names are deliberately left as they come out of the IFC — `IFCWALL`,
 * not "Wall" — so they match what users see in other IFC tooling.
 */
export declare class IfcClasses extends OBC.Component implements OBC.Disposable {
    static readonly uuid: "3b6f1c94-58ad-4d7e-9a02-7c1e5f2b8d41";
    enabled: boolean;
    readonly onClassesChanged: OBC.Event<{
        classes: BimTreeNode[];
    }>;
    readonly onLoadingStateChanged: OBC.Event<{
        isLoading: boolean;
    }>;
    /**
     * Required for `dispose()` to run at all: OBC's `isDisposeable()` is
     * `'dispose' in this && 'onDisposed' in this`.
     */
    readonly onDisposed: OBC.Event<string>;
    private _classes;
    private _isLoading;
    private _disposed;
    private _rebuildTimeout;
    /** In-flight refresh, so overlapping triggers share one pass. */
    private _refreshing;
    /** Set when a model changes mid-refresh; the current pass then runs again. */
    private _staleWhileRefreshing;
    /**
     * `${modelId}:${className}` pairs whose default visibility has been applied.
     * Keyed per model so a newly loaded file gets the same treatment, and applied
     * only once so it never overrides a class the user has since turned on.
     */
    private _defaultsApplied;
    constructor(components: OBC.Components);
    /**
     * Forget a removed model's applied defaults, so re-loading the same file
     * hides its site and spaces again rather than bringing them in visible.
     */
    private onModelRemoved;
    get classes(): BimTreeNode[];
    get isLoading(): boolean;
    private setLoadingState;
    private scheduleRefresh;
    /** Rebuilds the class list. Concurrent calls share one pass. */
    refresh(): Promise<BimTreeNode[]>;
    private build;
    /**
     * Hides the elements of every {@link DEFAULT_HIDDEN_IFC_CLASSES} class the
     * first time each model contributes them.
     *
     * Tracked per (model, class) rather than per class: a file loaded later still
     * comes in with its site and spaces hidden, but a class the user has already
     * turned on is never hidden again for the models it was turned on for.
     */
    private applyDefaultVisibility;
    dispose(): void;
}
//# sourceMappingURL=IfcClasses.d.ts.map