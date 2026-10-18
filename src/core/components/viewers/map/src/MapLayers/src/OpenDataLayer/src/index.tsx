"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from "next-intl";
import * as React from "react";

import { DatasetsContext } from '../../../../../../../../store';
import { MapContext } from "../../../../../../../../store/Map/context";
import { isRasterDataset } from "../../../../../datasets/src/mapServices";
import { MapLayerClickPriority } from "../../../../../utils/MapEventManager/MapClickManager";
import MapFeaturePopoverMenu from "../../../../MapFeaturePopoverMenu";

import { GeoJsonDatasetLayer } from "./GeoJsonDatasetLayer";
import { MVTDatasetLayer } from "./MVTDatasetLayer";
import { RasterDatasetLayer } from "./RasterDatasetLayer";

import type { Dataset } from '../../../../../../../../types/datasetTypes';
import type { Building } from '../../../../../../../../types/dbTypes';
import type { PopupEntry } from "../../../../../../../../types/map";
import type { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";

interface BuildingDataset {
    "type": "buildings";
    "data": Building[];
    "name": string;
    "visible"?: boolean;
}

const isBuildingDataset = (dataset: unknown): dataset is BuildingDataset => {
    return (dataset as { type?: unknown }).type === "buildings" && "data" in (dataset as object);
};

function layerComponent(dataset: Dataset) {
    if (isRasterDataset(dataset)) return RasterDatasetLayer;
    if (dataset.datasetType === 'MVT' || dataset.type === 'MVT') return MVTDatasetLayer;
    return GeoJsonDatasetLayer;
}

export const OpenDataLayers = () => {
    const { "state": mapState, "dispatch": mapDispatch } = React.useContext(MapContext);
    const { map, mapClickManager } = mapState.map;
    const t = useTranslations('OpenDataFeaturePopover');

    const { state: datasetState } = React.useContext(DatasetsContext);
    const { addedDatasets } = datasetState.datasets;


    const layerIdsMapRef = React.useRef<Record<string, string[]>>({});
    const [allLayerNames, setAllLayerNames] = React.useState<string[]>([]);

    const handleLayerReady = React.useCallback((datasetName: string, layerIds: string[]) => {
        layerIdsMapRef.current[datasetName] = layerIds;
        setAllLayerNames(Object.values(layerIdsMapRef.current).flat());
    }, []);

    const handleLayerRemoved = React.useCallback((datasetName: string) => {
        delete layerIdsMapRef.current[datasetName];
        setAllLayerNames(Object.values(layerIdsMapRef.current).flat());
    }, []);

    React.useEffect(() => {
        if (!map || !mapClickManager || allLayerNames.length === 0) return;

        const resolvePopups = (e: MapMouseEvent, hits: MapGeoJSONFeature[]): PopupEntry[] => {
            const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];

            return hits.map((feature) => {
                const properties = feature.properties || {};
                const _name = Object.entries(properties).find(([key]) => key.toLowerCase().includes('name'))?.[1] || undefined;

                let datasetNameFromFeature = properties.datasetName;
                if (!datasetNameFromFeature && feature.layer) {
                    const layerId = feature.layer.id;
                    const suffixes = ['-unclustered-point', '-outline', '-fill', '-line', '-extrusion', '-points'];
                    let extractedName = layerId;
                    for (const suffix of suffixes) {
                        if (layerId.endsWith(suffix)) {
                            extractedName = layerId.slice(0, -suffix.length);
                            break;
                        }
                    }
                    if (extractedName === layerId && layerId.includes('-')) {
                        extractedName = layerId.slice(0, layerId.lastIndexOf('-'));
                    }
                    datasetNameFromFeature = extractedName;
                }

                const featureId = properties.globalid || properties.id || `temp-${Date.now()}`;
                // The popover reads only id and properties; spreading the feature would drop its prototype.
                const featureClone: any = {
                    id: featureId,
                    properties: { ...properties, coordinates, _name, datasetName: datasetNameFromFeature },
                };

                return {
                    // One resolver is registered per open-data layer id, so fill + outline must collapse to one entry.
                    id: `open-data:${datasetNameFromFeature}:${featureId}`,
                    layerId: feature.layer?.id ?? '',
                    priority: MapLayerClickPriority.OpenDataLayerClickPriority,
                    title: (_name as string) || (datasetNameFromFeature as string) || t('unknownDataset'),
                    coordinates,
                    render: (header) => (
                        <MapFeaturePopoverMenu
                            header={header}
                            feature={featureClone}
                            onCloseAction={() => clearClickedFeature()}
                        />
                    ),
                };
            });
        };

        for (const layerId of allLayerNames) {
            mapClickManager.register(layerId, MapLayerClickPriority.OpenDataLayerClickPriority, resolvePopups);
        }

        return () => {
            for (const layerId of allLayerNames) {
                mapClickManager.unregister(layerId);
            }
        };
    }, [map, mapClickManager, allLayerNames, t]);

    React.useEffect(() => {
        if (!map) return;

        const canvas = map.getCanvas();

        const setDefaultCursor = () => {
            canvas.style.cursor = 'default';
        };

        if (allLayerNames.length === 0) {
            setDefaultCursor();
            return;
        }

        const handleMouseMove = (e: MapMouseEvent) => {
            const hoveredFeatures = map.queryRenderedFeatures(e.point, { layers: allLayerNames });
            canvas.style.cursor = hoveredFeatures.length > 0 ? 'pointer' : 'default';
        };

        const handleMouseLeave = () => {
            setDefaultCursor();
        };

        map.on('mousemove', handleMouseMove);
        map.on('mouseout', handleMouseLeave);

        return () => {
            map.off('mousemove', handleMouseMove);
            map.off('mouseout', handleMouseLeave);
            setDefaultCursor();
        };
    }, [map, allLayerNames]);

    function clearClickedFeature() {
        mapDispatch({ type: "SET_CLICKED_FEATURE", payload: { clickedFeature: null } });
        mapDispatch({ type: "SET_POPUP_STACK", payload: null });
    }

    const sortedDatasets = React.useMemo(() => {
        if (!addedDatasets?.length) return [];
        return [...addedDatasets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [addedDatasets]);

    return (
        <>
            {sortedDatasets.map((dataset, index) => {
                if (dataset.visible === false) return null;
                if (isBuildingDataset(dataset)) return null;
                if (dataset.drawnByPlugin) return null;

                const DatasetLayer = layerComponent(dataset);
                return (
                    <DatasetLayer
                        key={dataset.name}
                        dataset={dataset}
                        index={index}
                        onLayerReady={handleLayerReady}
                        onLayerRemoved={handleLayerRemoved}
                    />
                );
            })}
        </>
    );
};
