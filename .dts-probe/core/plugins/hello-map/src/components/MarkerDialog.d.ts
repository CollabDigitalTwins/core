interface Props {
    close: () => void;
    /** Supplied by whichever surface opened this — the sidebar tab, or a row on the page. */
    markerKey?: string;
}
/** One marker in full. Core owns the overlay and Escape; this outlives whatever opened it. */
export declare function MarkerDialog({ close, markerKey }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=MarkerDialog.d.ts.map