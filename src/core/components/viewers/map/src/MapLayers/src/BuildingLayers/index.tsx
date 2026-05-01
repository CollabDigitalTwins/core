"use client"

import type { MapMouseEvent } from "maplibre-gl";

import * as React from "react";
import { Popup } from "react-map-gl/maplibre";

import { MapContext } from "../../../../../../../store/Map/context";
import { useBuildingsContext } from "../../../../../../../store";
import { useBuildings } from "../../../../../../../hooks/buildings/buildings";
import { MapLayerClickPriority } from "../../../../utils/MapEventManager/MapClickManager";
import MapFeaturePopoverMenu from "../../../MapFeaturePopoverMenu";
import { highlightColor } from "../../../../../../../types/martinTypes";
import { useBimContext } from "../../../../../../../store/BIM/context";

const LAYER_ID = "maptiler-3d-buildings";

function buildLayerFilter() {
  return [
    "all",
    ["!=", ["get", "hide_3d"], true],
    ["!=", ["get", "hide_3d"], "true"],
  ];
}

function buildHeightExpression(hiddenBimOsmIds: string[]) {
  return [
    "case",
    [
      "any",
      ["in", ["to-string", ["id"]], ["literal", hiddenBimOsmIds]],
      ["in", ["to-string", ["coalesce", ["get", "osm_id"], ""]], ["literal", hiddenBimOsmIds]],
    ],
    0.1,
    ["coalesce", ["get", "height"], 5],
  ];
}

function addBuildingLayer(map: any, hiddenBimOsmIds: string[]) {
  try {
    if (!map.getSource("openmaptiles")) return;
    if (map.getLayer(LAYER_ID)) return;

    // Insert below road labels so buildings don't cover text
    const beforeId = map.getLayer("road_label") ? "road_label" : undefined;

    map.addLayer({
      id: LAYER_ID,
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      filter: buildLayerFilter(),
      paint: {
        "fill-extrusion-color": ["coalesce", ["get", "colour"], "#cccccc"],
        "fill-extrusion-height": buildHeightExpression(hiddenBimOsmIds),
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": [
          "interpolate", ["linear"], ["zoom"],
          14, 0.6,
          16, 0.8,
        ],
      },
    }, beforeId);
  } catch {
    // Map style may be in a transitional state during layer addition
  }
}

export function BuildingLayer() {
  const { state: mapState } = React.useContext(MapContext);
  const { map, mapClickManager } = mapState.map;
  const { setCompareItems } = useBuildingsContext();
  const { buildings } = useBuildings();
  const { state: bimState } = useBimContext();
  const { bimModelsAddedToMap } = bimState.bim;

  const [hoveredFeature, setHoveredFeature] = React.useState<string | number | null>(null);
  const [clickedFeature, setClickedFeature] = React.useState<any>(null);
  const [buildingByOsmId, setBuildingByOsmId] = React.useState<Record<string, { id: number }>>({});

  const hiddenBimOsmIds = React.useMemo(
    () => Array.from(new Set(
      (bimModelsAddedToMap || [])
        .map((model: any) => model?.building?.buildingOsmId)
        .filter((value: unknown): value is string | number => value !== null && value !== undefined)
        .map((value) => String(value))
    )),
    [bimModelsAddedToMap],
  );

  React.useEffect(() => {
    if (!buildings || !Array.isArray(buildings) || buildings.length === 0) {
      setBuildingByOsmId({});
      return;
    }

    const mapping: Record<string, { id: number }> = {};
    buildings.forEach((building: any) => {
      if (building.buildingOsmId != null) {
        mapping[String(building.buildingOsmId)] = { id: building.id };
      }
    });

    setBuildingByOsmId((prevMapping) => {
      const newKeys = Object.keys(mapping);
      const prevKeys = Object.keys(prevMapping);

      if (newKeys.length !== prevKeys.length) {
        return mapping;
      }

      const hasChanges = newKeys.some((key) => mapping[key]?.id !== prevMapping[key]?.id);
      return hasChanges ? mapping : prevMapping;
    });
  }, [buildings]);

  // Add the layer imperatively
  React.useEffect(() => {
    if (!map) return;

    if (map.isStyleLoaded()) {
      addBuildingLayer(map, hiddenBimOsmIds);
    }

    const onStyleLoad = () => addBuildingLayer(map, hiddenBimOsmIds);
    map.on("styledata", onStyleLoad);

    return () => {
      try {
        map.off("styledata", onStyleLoad);
        if (map.getLayer(LAYER_ID)) {
          map.removeLayer(LAYER_ID);
        }
      } catch {
        // Map may have been destroyed before cleanup runs
      }
    };
  }, [map, hiddenBimOsmIds]);

  React.useEffect(() => {
    if (!map || !map.getLayer(LAYER_ID)) return;

    map.setFilter(LAYER_ID, buildLayerFilter() as any);
    map.setPaintProperty(LAYER_ID, "fill-extrusion-height", buildHeightExpression(hiddenBimOsmIds) as any);
  }, [map, hiddenBimOsmIds]);

  // Register click, hover, and mouse leave handlers
  React.useEffect(() => {
    if (!map || !mapClickManager) return;

    const handleClick = (e: MapMouseEvent) => {
      if (!map.getLayer(LAYER_ID)) return;
      const clicked = map.queryRenderedFeatures(e.point, { layers: [LAYER_ID] });
      const feature = clicked?.[0];
      if (!feature) {
        setClickedFeature(null);
        return;
      }

      const properties = feature.properties || {};
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;
      const coordinates = [lng, lat];

      // Use MVT feature.id (OSM ID) or fall back to properties
      const featureId = feature.id || properties.osm_id || `temp-${Date.now()}`;
      const normalizedOsmId = String(featureId);
      const dbId = buildingByOsmId[normalizedOsmId]?.id || null;
      const _name = Object.entries(properties).find(
        ([key]) => key.toLowerCase().includes("name")
      )?.[1] || undefined;

      const featureClone: any = {
        ...feature,
        id: featureId,
        properties: {
          ...properties,
          coordinates,
          _name,
          osm_id: normalizedOsmId,
          isBuilding: true,
          isDbBuilding: Boolean(dbId),
          dbId,
          _popupNonce: Date.now(),
        },
      };

      setClickedFeature(featureClone);
    };

    const handleHover = (e: MapMouseEvent) => {
      if (!map.getLayer(LAYER_ID)) return;
      const hovered = map.queryRenderedFeatures(e.point, { layers: [LAYER_ID] });

      if (hovered[0]) {
        map.getCanvas().style.cursor = "pointer";
        const hoveredId = hovered[0].id || hovered[0].properties?.osm_id || null;
        setHoveredFeature(hoveredId);
      } else {
        map.getCanvas().style.cursor = "";
        setHoveredFeature(null);
      }
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      setHoveredFeature(null);
    };

    mapClickManager.register(
      LAYER_ID,
      MapLayerClickPriority.BuildingLayersClickPriority,
      handleClick
    );
    map.on("mousemove", LAYER_ID, handleHover);
    map.on("mouseleave", LAYER_ID, handleMouseLeave);

    return () => {
      mapClickManager.unregister(LAYER_ID);
      map.off("mousemove", LAYER_ID, handleHover);
      map.off("mouseleave", LAYER_ID, handleMouseLeave);
    };
  }, [map, mapClickManager, buildingByOsmId, hiddenBimOsmIds]);

  // Update paint property for hover/click highlighting
  React.useEffect(() => {
    if (!map || !map.getLayer(LAYER_ID)) return;

    const defaultColorExpr = ["coalesce", ["get", "colour"], "#cccccc"] as const;
    const conditionalColorArgs: any[] = [];

    if (clickedFeature?.id != null) {
      conditionalColorArgs.push(["==", ["id"], clickedFeature.id], highlightColor);
    }
    if (hoveredFeature != null) {
      conditionalColorArgs.push(["==", ["id"], hoveredFeature], "#e0e0e0");
    }

    const colorExpr = conditionalColorArgs.length > 0
      ? ["case", ...conditionalColorArgs, defaultColorExpr]
      : defaultColorExpr;

    map.setPaintProperty(LAYER_ID, "fill-extrusion-color", colorExpr);
  }, [map, hoveredFeature, clickedFeature]);

  return (
    <>
      {clickedFeature && clickedFeature.properties?.coordinates && (
        <Popup
          anchor="bottom"
          closeButton={true}
          closeOnClick={false}
          focusAfterOpen={true}
          key={`maptiler-${clickedFeature.id}-${clickedFeature.properties._popupNonce}`}
          latitude={clickedFeature.properties.coordinates[1]}
          longitude={clickedFeature.properties.coordinates[0]}
          onClose={() => setClickedFeature(null)}
        >
          <MapFeaturePopoverMenu
            feature={clickedFeature}
            onCloseAction={() => {
              setClickedFeature(null);
              setCompareItems([]);
            }}
          />
        </Popup>
      )}
    </>
  );
}
