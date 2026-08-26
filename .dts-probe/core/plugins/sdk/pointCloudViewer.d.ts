/**
 * The point-cloud viewer, as a plugin sees it.
 *
 * Potree ships no type declarations, so `viewer` is deliberately `unknown`: a
 * plugin narrows it itself rather than core inventing a type that could drift from
 * the library.
 */
export interface PointCloudToolProps {
    viewer: unknown;
    /** False until Potree has finished initialising. */
    ready: boolean;
}
export declare function usePointCloudViewer(): PointCloudToolProps;
//# sourceMappingURL=pointCloudViewer.d.ts.map