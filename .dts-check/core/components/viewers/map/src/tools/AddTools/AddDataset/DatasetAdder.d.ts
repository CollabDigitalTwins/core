import * as React from 'react';
interface DatasetAdderProps {
    onClose?: () => void;
}
/**
 * Add a dataset from a GeoJSON file or a pasted URL (GeoJSON, ArcGIS, WMS).
 * Vector sources render through OpenDataLayers; WMS goes straight on the map as a
 * raster overlay. File uploads also persist to MinIO and re-hydrate on reload.
 */
export declare const DatasetAdder: ({ onClose }: DatasetAdderProps) => React.JSX.Element;
export {};
//# sourceMappingURL=DatasetAdder.d.ts.map