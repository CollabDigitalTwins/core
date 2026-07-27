"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins


import * as React from "react";
import { Popup } from "react-map-gl/maplibre";

import { useBuildings } from "../../../../../../../hooks/buildings/buildings";
import { useBuildingsContext } from "../../../../../../../store";
import { useBimContext } from "../../../../../../../store/BIM/context";
import { MapContext } from "../../../../../../../store/Map/context";
import { ViewerNames } from "../../../../../../../types/dbTypes";
import { useBuildingSensorColours } from "../../../../../../ui/Sensors/useBuildingSensorColours";
import { MapLayerClickPriority } from "../../../../utils/MapEventManager/MapClickManager";
import MapFeaturePopoverMenu from "../../../MapFeaturePopoverMenu";

import {
  buildingColourExpression,
  DEFAULT_COLOUR_EXPRESSION,
  osmColourEntries,
  type PaintExpression,
} from "./buildingColourExpression";
import { BuildingSensorMarkers } from "./src/BuildingSensorMarkers";

import type { MapMouseEvent } from "maplibre-gl";

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

function addBuildingLayer(map: any, hiddenBimOsmIds: string[], colourExpr: PaintExpression) {
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
        // Seeded rather than hardcoded: `styledata` re-adds this layer after any setStyle, and
        // the paint effect below will not re-run for it, so the colours would be lost.
        "fill-extrusion-color": colourExpr,
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

  // Footprints are tinted by the average reading of the legend's sensor type. Nothing is polled
  // and nothing changes colour until a type is pinned in the legend and switched on.
  const sensorColours = useBuildingSensorColours(ViewerNames.map);
  const { averages, colourKey } = sensorColours;

  const osmColours = React.useMemo(
    () => osmColourEntries(averages, buildings ?? []),
    [averages, buildings],
  );

  const colourExpr = React.useMemo(
    () => buildingColourExpression({
      osmColours,
      clickedKey: clickedFeature?.id ?? null,
      hoveredKey: hoveredFeature,
    }),
    [osmColours, clickedFeature, hoveredFeature],
  );

  // Read by the add-layer effect, which must not re-run when only the colours change.
  const colourExprRef = React.useRef<PaintExpression>(DEFAULT_COLOUR_EXPRESSION);
  colourExprRef.current = colourExpr;

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
      addBuildingLayer(map, hiddenBimOsmIds, colourExprRef.current);
    }

    const onStyleLoad = () => addBuildingLayer(map, hiddenBimOsmIds, colourExprRef.current);
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

  // Single writer for fill-extrusion-color: hover, click and sensor colours are merged into one
  // expression upstream, so there is no second effect to race with. `colourExpr` only changes
  // when a highlight moves or a sensor colour actually differs, not on every 15s poll.
  React.useEffect(() => {
    if (!map || !map.getLayer(LAYER_ID)) return;
    map.setPaintProperty(LAYER_ID, "fill-extrusion-color", colourExpr);
  }, [map, colourExpr]);

  return (
    <>
      <BuildingSensorMarkers buildings={buildings ?? []} sensorColours={sensorColours} />
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
