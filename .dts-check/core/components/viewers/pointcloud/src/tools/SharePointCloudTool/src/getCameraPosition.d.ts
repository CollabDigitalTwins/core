/**
 * Get camera position and target from Potree viewer for sharing
 */
export interface CameraPosition {
    position: {
        x: number;
        y: number;
        z: number;
    };
    target: {
        x: number;
        y: number;
        z: number;
    };
}
/**
 * Gets the current camera position and target/pivot from Potree viewer
 */
export declare function getCameraPosition(viewer: any): CameraPosition | null;
//# sourceMappingURL=getCameraPosition.d.ts.map