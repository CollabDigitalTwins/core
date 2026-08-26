/**
 * Mirrors the Highlighter's selection into `BimState.selection`.
 *
 * The Highlighter stays the single source of truth — this only publishes it so
 * React can read it. One central subscription rather than one per consumer, for
 * the same reason shadow enrolment is centralised in `ShadowEnroller`: every
 * path that changes the selection is then covered, including a
 * viewport click, a sidebar tree action, and a plugin calling `select()`.
 *
 * Renders nothing. Mount it once inside the BIM viewer, after the components are
 * set on the store — it re-subscribes when `bimComponents` changes, which is what
 * picks up the Highlighter once the viewer has built it.
 */
export declare function SelectionSync(): any;
//# sourceMappingURL=SelectionSync.d.ts.map