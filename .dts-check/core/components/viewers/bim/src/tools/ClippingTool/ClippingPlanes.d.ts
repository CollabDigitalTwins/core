import * as OBC from '@thatopen/components';
import type { UndoHistory } from '../../../../../../utils/undoHistory';
/**
 * Owns every clipping plane in the BIM viewer: creation from the cursor,
 * deletion, the black cut fill, and an undo stack covering all of it.
 *
 * A component rather than a hook because the viewer binds CTRL+Z at the top of
 * the tree, where the toolbar's React state is out of reach — the same reason
 * {@link ElementAppearance} keeps its history here.
 */
export declare class ClippingPlanes extends OBC.Component implements OBC.Disposable {
    static readonly uuid: "b7d3c418-5f26-4a91-8c07-1e94a2f6b3d5";
    enabled: boolean;
    /** {@link OBC.Disposable.onDisposed} */
    readonly onDisposed: OBC.Event<string>;
    /**
     * Undo/redo steps for adding, deleting and moving planes. Toggling the squares
     * is deliberately out: it is a view state the tool drives, not a change.
     */
    readonly history: UndoHistory;
    private _records;
    private _keySeq;
    /** The world {@link setup} ran for, so it runs once rather than per double-click. */
    private _setupWorld;
    private _squaresVisible;
    private _dragOrigin;
    constructor(components: OBC.Components);
    /**
     * Prepares the Clipper, the cut style and the drag listeners. Idempotent, and
     * cheap to call from an effect: everything here used to run on every
     * double-click, which re-registered the styling listener each time and left
     * orphan cut meshes behind.
     */
    setup(): void;
    /**
     * Adds a plane on the face under the cursor.
     *
     * Silent when the cursor is off the model: the tool's instruction toast is
     * still on screen, and an error toast per missed double-click is noise.
     */
    createAtCursor(): Promise<void>;
    /** Removes the plane under the cursor, if the cursor is over one. */
    deleteAtCursor(): void;
    /** Removes every plane, as one undo step. */
    deleteAll(): void;
    /**
     * Shows or hides the translucent squares. The arrow gizmos stay either way, so
     * leaving creation mode does not cost the user the ability to drag a section.
     */
    setSquaresVisible(visible: boolean): void;
    /** Steps back one plane change. Resolves false when there is nothing to undo. */
    undo(): Promise<boolean>;
    /** Re-applies the plane change that was just undone. */
    redo(): Promise<boolean>;
    /** {@link OBC.Disposable.dispose} */
    dispose(): void;
    private get world();
    private get clipper();
    private get styler();
    /** Builds the OBC plane and its cut for a record. False when there is no world. */
    private spawn;
    private despawn;
    private onBeforeDrag;
    private onAfterDrag;
    /**
     * Moves a plane to a point already on its normal.
     *
     * Deliberately not `setFromNormalAndCoplanarPoint`: that path calls `reset()`
     * and re-derives the orientation with `lookAt`, which is more than a slide
     * along the normal needs.
     */
    private moveTo;
}
//# sourceMappingURL=ClippingPlanes.d.ts.map