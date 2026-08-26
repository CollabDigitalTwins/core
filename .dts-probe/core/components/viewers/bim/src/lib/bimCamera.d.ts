import type * as OBC from '@thatopen/components';
/**
 * Camera framing, kept out of `lib/bimItemActions`.
 *
 * `FitCamera` reaches `CurrentWorld`, which extends `OBC.Component` at module
 * evaluation time — so importing it drags the world/camera graph in. The item
 * actions are used in contexts that have neither (unit tests included), and their
 * module graph is deliberately narrow.
 */
/**
 * Frame the camera on the current selection. No-op when nothing is selected.
 *
 * Reuses the overlay meshes the Highlighter has already built for the selection,
 * so this needs no geometry work of its own.
 */
export declare function fitToSelection(components: OBC.Components): Promise<void>;
//# sourceMappingURL=bimCamera.d.ts.map