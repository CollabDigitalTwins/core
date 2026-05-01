"use client";

import * as React from "react";
import { Source, Layer, Popup } from "react-map-gl/maplibre";
import type { MapMouseEvent } from "maplibre-gl";

import { MapContext } from "../../../../../../../../store/Map/context";
import type { Building } from '../../../../../../../../types/dbTypes';
import { DatasetsContext } from '../../../../../../../../store';
import { MapLayerClickPriority } from "../../../../../utils/MapEventManager/MapClickManager";
import MapFeaturePopoverMenu from "../../../../MapFeaturePopoverMenu";
import { fitGeoJsonBounds } from "../../../../../utils/fitGeojsonBounds";

interface BuildingDataset {
    "type": "buildings";
    "data": Building[];
    "name": string;
    "visible"?: boolean;
}

const isBuildingDataset = (dataset: any): dataset is BuildingDataset => {
    return dataset.type === "buildings" && "data" in dataset;
};

const parseNumericValue = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[$%\s]/g, '').replace(/,/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
};

const computeMinMax = (
    features: import('geojson').Feature[],
    fieldName: string,
): { min: number; max: number } | null => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let found = false;
    for (const feature of features) {
        const properties = (feature.properties || {}) as Record<string, unknown>;
        const value = parseNumericValue(properties[fieldName]);
        if (value === null) continue;
        found = true;
        if (value < min) min = value;
        if (value > max) max = value;
    }
    if (!found) return null;
    return { min, max: max === min ? min + 1 : max };
};

// ─── Per-dataset GeoJSON layer ────────────────────────────────────────
// Each dataset manages its own fetch lifecycle.  This means:
//   • datasets render PROGRESSIVELY as each one loads (no blocking)
//   • unmounting a dataset cancels only ITS fetch
//   • re-renders of one dataset never cancel fetches for another

interface GeoJsonDatasetLayerProps {
    dataset: any;
    index: number;
    onLayerReady: (datasetName: string, layerIds: string[]) => void;
    onLayerRemoved: (datasetName: string) => void;
}

const GeoJsonDatasetLayer = React.memo(({ dataset, index, onLayerReady, onLayerRemoved }: GeoJsonDatasetLayerProps) => {
    const { state: mapState } = React.useContext(MapContext);
    const { map } = mapState.map;

    const [featureCollection, setFeatureCollection] = React.useState<import('geojson').FeatureCollection | null>(null);
    const fitBoundsAppliedRef = React.useRef(false);

    // Fetch features once when the component mounts (or dataset identity changes)
    React.useEffect(() => {
        if (!map) return;
        let cancelled = false;

        const load = async () => {
            try {
                const fetched = await dataset.getFeatures();
                if (cancelled) return;

                const fc: import('geojson').FeatureCollection =
                    fetched?.type === 'FeatureCollection'
                        ? fetched
                        : { type: 'FeatureCollection', features: [] };

                setFeatureCollection(fc);
            } catch (error) {
                console.error(`OpenDataLayers: Error fetching features for "${dataset.name}":`, error);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [map, dataset.name]);

    // Build the layer JSX from the loaded feature collection
    const layerContent = React.useMemo(() => {
        if (!featureCollection || featureCollection.features.length === 0) return null;

        const geometryType = featureCollection.features[0]?.geometry?.type;
        if (!geometryType) return null;

        // ── colour resolution ──
        let layerColor: any = dataset.layerColor?.color || '#0d9488';
        let numericFieldName: string | undefined;

        if (dataset.selectedFieldName) {
            const selectedField = dataset.fields?.find((field: any) => field.name === dataset.selectedFieldName);
            if (selectedField?.layerColor) {
                if (selectedField.colorType === 'single') {
                    layerColor = selectedField.layerColor.color;
                }
                if (selectedField.colorType === 'minMax') {
                    try {
                        const fieldName = dataset.selectedFieldName;
                        numericFieldName = `__numeric_${fieldName}`;
                        const range = computeMinMax(featureCollection.features, fieldName);
                        if (range) {
                            const minColor = selectedField.layerColor.minColor || dataset.layerColor?.minColor || dataset.layerColor?.color || '#0d9488';
                            const maxColor = selectedField.layerColor.maxColor || dataset.layerColor?.maxColor || dataset.layerColor?.color || '#0d9488';
                            layerColor = [
                                'interpolate', ['linear'],
                                ['to-number', ['get', numericFieldName], range.min],
                                range.min, minColor,
                                range.max, maxColor,
                            ];
                        }
                    } catch (error) {
                        console.warn('Failed to build interpolate for field', dataset.selectedFieldName, error);
                    }
                }
                if (selectedField.colorType === 'boolean') {
                    const minColor = selectedField.layerColor.minColor || dataset.layerColor?.minColor || dataset.layerColor?.color || '#0d9488';
                    const maxColor = selectedField.layerColor.maxColor || dataset.layerColor?.maxColor || dataset.layerColor?.color || '#0d9488';
                    const fieldName = dataset.selectedFieldName;
                    layerColor = [
                        'case',
                        ['any',
                            ['==', ['get', fieldName], true],
                            ['==', ['get', fieldName], 1],
                            ['==', ['downcase', ['to-string', ['get', fieldName]]], 'true'],
                            ['==', ['downcase', ['to-string', ['get', fieldName]]], 'yes'],
                        ],
                        maxColor,
                        minColor,
                    ];
                }
            }
        }

        // ── inject datasetName + numeric shadow field into each feature ──
        const enrichedFC: import('geojson').FeatureCollection = {
            ...featureCollection,
            features: featureCollection.features.map((feature) => {
                let numericVal: number | undefined;
                if (numericFieldName && dataset.selectedFieldName) {
                    const v = parseNumericValue((feature.properties || {})[dataset.selectedFieldName]);
                    if (v !== null) numericVal = v;
                }
                return {
                    ...feature,
                    properties: {
                        ...feature.properties,
                        datasetName: dataset.name,
                        layer_color: layerColor,
                        ...(numericFieldName && numericVal !== undefined ? { [numericFieldName]: numericVal } : {}),
                    },
                };
            }),
        };

        // ── build layer props per geometry type ──
        const registeredIds: string[] = [];

        if (geometryType === 'Point' || geometryType === 'MultiPoint') {
            const paint = {
                'circle-radius': 6,
                'circle-color': layerColor,
                'circle-opacity': 0.8,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
            };
            registeredIds.push(`${dataset.name}-unclustered-point`);

            return {
                registeredIds,
                jsx: (
                    <Source
                        id={`${dataset.name}-source`}
                        key={`${index}-${dataset.name}-source`}
                        type="geojson"
                        data={enrichedFC}
                        cluster={true}
                        clusterMaxZoom={11}
                        clusterRadius={50}
                    >
                        <Layer
                            id={`${dataset.name}-clusters`}
                            filter={['has', 'point_count']}
                            type="circle"
                            paint={{
                                'circle-color': dataset.layerColor?.color || '#0d9488',
                                'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
                                'circle-opacity': 0.9,
                            }}
                        />
                        <Layer
                            id={`${dataset.name}-cluster-count`}
                            filter={['has', 'point_count']}
                            type="symbol"
                            layout={{
                                'text-field': '{point_count_abbreviated}',
                                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                                'text-size': 12,
                            }}
                            paint={{ 'text-color': '#fff' }}
                        />
                        <Layer
                            id={`${dataset.name}-unclustered-point`}
                            filter={['!', ['has', 'point_count']]}
                            type="circle"
                            paint={paint}
                        />
                    </Source>
                ),
            };
        }

        if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
            const mainId = `${dataset.name}-line`;
            registeredIds.push(mainId);
            return {
                registeredIds,
                jsx: (
                    <Source
                        id={`${dataset.name}-source`}
                        key={`${index}-${dataset.name}-source`}
                        type="geojson"
                        data={enrichedFC}
                    >
                        <Layer
                            id={mainId}
                            type="line"
                            paint={{ 'line-color': layerColor, 'line-width': 3, 'line-opacity': 1 }}
                        />
                    </Source>
                ),
            };
        }

        if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
            const fillId = `${dataset.name}-fill`;
            const outlineId = `${dataset.name}-outline`;
            registeredIds.push(fillId, outlineId);
            return {
                registeredIds,
                jsx: (
                    <Source
                        id={`${dataset.name}-source`}
                        key={`${index}-${dataset.name}-source`}
                        type="geojson"
                        data={enrichedFC}
                    >
                        <Layer
                            id={fillId}
                            type="fill"
                            paint={{ 'fill-color': layerColor, 'fill-opacity': 0.5 }}
                        />
                        <Layer
                            id={outlineId}
                            type="line"
                            paint={{ 'line-color': '#ffffff', 'line-width': 2 }}
                        />
                    </Source>
                ),
            };
        }

        return null;
    }, [featureCollection, dataset.name, dataset.layerColor, dataset.selectedFieldName, dataset.fields, index]);

    // Register / unregister interactive layer IDs with the parent
    React.useEffect(() => {
        if (layerContent?.registeredIds) {
            onLayerReady(dataset.name, layerContent.registeredIds);
        }
        return () => { onLayerRemoved(dataset.name); };
    }, [layerContent?.registeredIds, dataset.name, onLayerReady, onLayerRemoved]);

    return layerContent?.jsx ?? null;
});
GeoJsonDatasetLayer.displayName = 'GeoJsonDatasetLayer';


// ─── Per-dataset MVT layer ────────────────────────────────────────────

interface MVTDatasetLayerProps {
    dataset: any;
    index: number;
    onLayerReady: (datasetName: string, layerIds: string[]) => void;
    onLayerRemoved: (datasetName: string) => void;
}

const MVTDatasetLayer = React.memo(({ dataset, index, onLayerReady, onLayerRemoved }: MVTDatasetLayerProps) => {
    const tileUrl = dataset.url || dataset.information;
    const sourceLayer = (dataset as any)?.serviceInfo?.sourceLayer || dataset.id || dataset.name.toLowerCase().replace(/\s+/g, '_');
    const layerColor = dataset.layerColor?.color || '#0d9488';
    const isPointLayer = dataset.layerType === 'circle' || /point/i.test(sourceLayer);
    const isMartinBuilding = /buildings?/i.test((dataset as any)?.serviceInfo?.sourceLayer || dataset.id || dataset.name);
    const extraIsBuilding = (dataset.layerType === 'fill' || (isMartinBuilding && !dataset.layerType)) && !isPointLayer;

    const mainLayerId = isPointLayer
        ? `${dataset.name}-points`
        : extraIsBuilding
            ? `${dataset.name}-extrusion`
            : `${dataset.name}-fill`;
    const outlineLayerId = `${dataset.name}-outline`;

    // Register interactive layer IDs
    React.useEffect(() => {
        const ids = isPointLayer ? [mainLayerId] : [mainLayerId, outlineLayerId];
        onLayerReady(dataset.name, ids);
        return () => { onLayerRemoved(dataset.name); };
    }, [dataset.name, mainLayerId, outlineLayerId, isPointLayer, onLayerReady, onLayerRemoved]);

    if (!tileUrl) {
        console.error(`❌ OpenDataLayers: No tile URL found for MVT dataset "${dataset.name}"`);
        return null;
    }

    if (extraIsBuilding) {
        return (
            <Source id={`${dataset.name}-source`} key={`${index}-${dataset.name}-source`} type="vector" tiles={[tileUrl]}>
                <Layer
                    id={mainLayerId} type="fill-extrusion" source-layer={sourceLayer}
                    paint={{
                        'fill-extrusion-color': layerColor,
                        'fill-extrusion-height': ['coalesce', ['to-number', ['get', 'heightmax']], 0],
                        'fill-extrusion-opacity': 0.8,
                    }}
                    minzoom={15.5}
                />
                <Layer id={outlineLayerId} type="line" source-layer={sourceLayer} paint={{ 'line-color': layerColor, 'line-width': 1, 'line-opacity': 0.8 }} />
            </Source>
        );
    }

    if (isPointLayer) {
        return (
            <Source id={`${dataset.name}-source`} key={`${index}-${dataset.name}-source`} type="vector" tiles={[tileUrl]}>
                <Layer
                    id={mainLayerId} type="circle" source-layer={sourceLayer}
                    paint={{ 'circle-radius': 6, 'circle-color': layerColor, 'circle-opacity': 0.8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }}
                />
            </Source>
        );
    }

    return (
        <Source id={`${dataset.name}-source`} key={`${index}-${dataset.name}-source`} type="vector" tiles={[tileUrl]}>
            <Layer id={mainLayerId} type="fill" source-layer={sourceLayer} paint={{ 'fill-color': layerColor, 'fill-opacity': 0.6 }} />
            <Layer id={outlineLayerId} type="line" source-layer={sourceLayer} paint={{ 'line-color': layerColor, 'line-width': 1, 'line-opacity': 0.8 }} />
        </Source>
    );
});
MVTDatasetLayer.displayName = 'MVTDatasetLayer';


// ─── Main orchestrator ────────────────────────────────────────────────

export const OpenDataLayers = () => {
    const { "state": mapState, "dispatch": mapDispatch } = React.useContext(MapContext);
    const { map, mapClickManager } = mapState.map;

    const { state: datasetState } = React.useContext(DatasetsContext);
    const { addedDatasets } = datasetState.datasets;

    const [clickedFeature, setClickedFeature] = React.useState<any>(null);
    const [addedFeaturesPopup, setAddedFeaturesPopup] = React.useState<Array<{
        id: string | number;
        popup: React.ReactElement;
    }>>([]);

    // Track interactive layer IDs per dataset for click handling
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

    // ── Click handling ──
    React.useEffect(() => {
        if (!map || !mapClickManager || allLayerNames.length === 0) return;

        const handleMapClick = (e: MapMouseEvent) => {
            const clicked = map.queryRenderedFeatures(e.point, { layers: allLayerNames });
            const localClickedFeature = clicked?.[0];

            if (!localClickedFeature) {
                setClickedFeature(null);
                return;
            }

            const lng = e.lngLat.lng;
            const lat = e.lngLat.lat;
            const coordinates = [lng, lat];
            const properties = localClickedFeature.properties || {};
            const _name = Object.entries(properties).find(([key]) => key.toLowerCase().includes('name'))?.[1] || undefined;

            let datasetNameFromFeature = properties.datasetName;
            if (!datasetNameFromFeature && localClickedFeature.layer) {
                const layerId = localClickedFeature.layer.id;
                const suffixes = ['-unclustered-point', '-clusters', '-cluster-count', '-outline', '-fill', '-line', '-circle', '-extrusion', '-points'];
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
            localClickedFeature.id = featureId;
            localClickedFeature.properties = { ...properties, coordinates, _name, datasetName: datasetNameFromFeature };
            setClickedFeature(localClickedFeature);
        };

        for (const layerId of allLayerNames) {
            mapClickManager.register(layerId, MapLayerClickPriority.OpenDataLayerClickPriority, handleMapClick);
        }

        return () => {
            for (const layerId of allLayerNames) {
                mapClickManager.unregister(layerId);
            }
        };
    }, [map, mapClickManager, allLayerNames]);

    // ── Hover cursor handling ──
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
        map.on('mouseleave', handleMouseLeave);

        return () => {
            map.off('mousemove', handleMouseMove);
            map.off('mouseleave', handleMouseLeave);
            setDefaultCursor();
        };
    }, [map, allLayerNames]);

    // ── Popup ──
    React.useEffect(() => {
        if (!clickedFeature || !clickedFeature.properties?.coordinates) {
            setAddedFeaturesPopup([]);
            return;
        }
        const popup = (
            <Popup
                anchor="bottom"
                closeButton={true}
                closeOnClick={false}
                closeOnMove={false}
                focusAfterOpen={true}
                key={clickedFeature.id}
                latitude={clickedFeature.properties.coordinates[1]}
                longitude={clickedFeature.properties.coordinates[0]}
            >
                <MapFeaturePopoverMenu
                    feature={clickedFeature}
                    onCloseAction={() => clearClickedFeature()}
                />
            </Popup>
        );
        setAddedFeaturesPopup([{ id: clickedFeature.id as string | number, popup }]);
    }, [clickedFeature]);

    function clearClickedFeature() {
        mapDispatch({ type: "SET_CLICKED_FEATURE", payload: { clickedFeature: null } });
        setClickedFeature(null);
    }

    // ── Sort datasets by display order ──
    const sortedDatasets = React.useMemo(() => {
        if (!addedDatasets?.length) return [];
        return [...addedDatasets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [addedDatasets]);

    return (
        <>
            {sortedDatasets.map((dataset, index) => {
                if (dataset.visible === false) return null;
                if (isBuildingDataset(dataset)) return null;

                if (dataset.type === 'MVT' || dataset.datasetType === 'MVT') {
                    return (
                        <MVTDatasetLayer
                            key={dataset.name}
                            dataset={dataset}
                            index={index}
                            onLayerReady={handleLayerReady}
                            onLayerRemoved={handleLayerRemoved}
                        />
                    );
                }

                return (
                    <GeoJsonDatasetLayer
                        key={dataset.name}
                        dataset={dataset}
                        index={index}
                        onLayerReady={handleLayerReady}
                        onLayerRemoved={handleLayerRemoved}
                    />
                );
            })}

            {addedFeaturesPopup.map((popup) => (
                <React.Fragment key={popup.id}>{popup.popup}</React.Fragment>
            ))}
        </>
    );
};
