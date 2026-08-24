import type maplibregl from 'maplibre-gl';
/**
 * This is very important. Declare a new priority for your layer in this enum if you need to,
 * otherwise, just use the one that has been declared
 * Higher priority is clicked first.
 */
export declare enum MapLayerClickPriority {
    SiteLayerClickPriority = 50,
    BuildingLayersClickPriority = 100,
    CommentLayersClickPriority = 200,
    MartinLayerClickPriority = 300,
    OpenDataLayerClickPriority = 350,
    FileLayerCLickPriority = 400,
    BimModelLayerPriority = 600,
    ActiveTool = 1000
}
export type ClickCallback = (event: maplibregl.MapMouseEvent, features: maplibregl.MapGeoJSONFeature[]) => void;
export declare class MapClickManager {
    private map;
    private clickHandlers;
    private boundedClickHandler;
    constructor(map: maplibregl.Map);
    register(layerId: string, priority: MapLayerClickPriority, callback: ClickCallback): void;
    unregister(layerId: any): void;
    private handleMapClick;
    destroy(): void;
}
//# sourceMappingURL=MapClickManager.d.ts.map