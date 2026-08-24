import { Marker } from 'maplibre-gl';
import type { LayerColors } from '../../../../types/datasetTypes';
export interface ClusterDataset {
    name: string;
    data: any[];
    layerColor?: LayerColors | string;
}
export interface ClusterOptions {
    longitudeKey?: string;
    latitudeKey?: string;
    color?: string;
    clusterMaxZoom?: number;
    clusterRadius?: number;
}
export declare class MarkerManager {
    private markers;
    private marker;
    private map;
    private escKeyCleanup;
    private _editing;
    private _coordinates;
    private defaultColour;
    private allowMultiple;
    get editing(): boolean;
    set editing(value: boolean);
    get coordinates(): [number, number] | null;
    create(coordinates: [number, number], map: any, options?: {
        allowMultiple?: boolean;
        layerColor?: LayerColors | string;
        editing?: boolean;
    }): Marker;
    private updateMarkerDraggable;
    private handleMarkerDragEnd;
    private handleEscKey;
    private setupEscapeKeyListener;
    remove(): void;
    updatePosition(coordinates: [number, number]): void;
    hasMarker(): boolean;
    getMarker(): Marker | null;
    onRemoved(callback: (event: CustomEvent) => void): () => void;
    onMoved(callback: (event: CustomEvent) => void): () => void;
    onEditingChanged(callback: (event: CustomEvent) => void): () => void;
    private dispatchMarkerRemovedEvent;
    private dispatchMarkerMovedEvent;
    private dispatchEditingChangedEvent;
    static addClusterMarkers(map: any, dataset: ClusterDataset, options?: ClusterOptions): void;
    destroy(): void;
}
//# sourceMappingURL=MarkerManager.d.ts.map