import * as React from 'react';
import type { MapGeoJSONFeature } from 'maplibre-gl';
interface OpenDataFeaturePopoverProps {
    feature: MapGeoJSONFeature;
    isOpen: boolean;
    onCloseAction: () => void;
}
export default function OpenDataFeaturePopover({ feature, isOpen, onCloseAction, }: OpenDataFeaturePopoverProps): React.JSX.Element;
export {};
//# sourceMappingURL=OpenDataFeaturePopover.d.ts.map