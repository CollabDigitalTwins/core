export type ViewerPosition = {
    type: 'map';
    lat: number;
    lng: number;
    zoom: number;
    bearing: number;
    pitch: number;
} | {
    type: 'bim' | 'pointcloud';
    camX: number;
    camY: number;
    camZ: number;
    tarX: number;
    tarY: number;
    tarZ: number;
};
export declare function useCurrentViewerPosition(): () => ViewerPosition | null;
//# sourceMappingURL=useCurrentViewerPosition.d.ts.map