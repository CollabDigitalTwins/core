import * as React from 'react';
interface Props {
    close: () => void;
    /** Supplied by whichever surface opened this — the sidebar tab, or the toolbar panel. */
    spaceKey?: string;
}
/**
 * One space in full, including the IFC attributes the plugin does not store. Core owns the
 * overlay and Escape; this renders the body, and outlives whatever opened it.
 */
export declare function SpaceDialog({ close, spaceKey }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=SpaceDialog.d.ts.map