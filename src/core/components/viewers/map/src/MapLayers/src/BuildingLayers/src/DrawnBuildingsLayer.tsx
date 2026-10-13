"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import { MapContext } from "../../../../../../../../store/Map/context";
import { MapLayerClickPriority } from "../../../../../utils/MapEventManager/MapClickManager";
import { buildingPopupEntry } from "../buildingPopupEntry";
import { drawnFootprints } from "../drawnFootprints";

import type { Building } from "../../../../../../../../types/dbTypes";
import type { PopupEntry } from "../../../../../../../../types/map";
import type { GeoJSONSource, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";

const DRAWN_BUILDINGS_ID = "cdt-drawn-buildings";

interface DrawnBuildingsLayerProps {
  buildings: Building[];
  fallbackName: string;
  onClosePopup: () => void;
}

export function DrawnBuildingsLayer({ buildings, fallbackName, onClosePopup }: DrawnBuildingsLayerProps) {
  const { state: mapState } = React.useContext(MapContext);
  const { map, mapClickManager, show3dBuildings } = mapState.map;

  const footprints = React.useMemo(() => drawnFootprints(buildings), [buildings]);
  const latest = React.useRef({ footprints, show3dBuildings });
  latest.current = { footprints, show3dBuildings };

  React.useEffect(() => {
    if (!map) return;

    const addLayer = () => {
      if (!map.isStyleLoaded() || map.getLayer(DRAWN_BUILDINGS_ID)) return;
      if (!map.getSource(DRAWN_BUILDINGS_ID)) {
        map.addSource(DRAWN_BUILDINGS_ID, { type: "geojson", data: latest.current.footprints });
      }
      map.addLayer({
        id: DRAWN_BUILDINGS_ID,
        type: "fill-extrusion",
        source: DRAWN_BUILDINGS_ID,
        layout: { visibility: latest.current.show3dBuildings ? "visible" : "none" },
        paint: {
          "fill-extrusion-color": "#94a3b8",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-opacity": 0.85,
        },
      });
    };

    addLayer();
    map.on("styledata", addLayer);
    return () => {
      map.off("styledata", addLayer);
      try {
        if (map.getLayer(DRAWN_BUILDINGS_ID)) map.removeLayer(DRAWN_BUILDINGS_ID);
        if (map.getSource(DRAWN_BUILDINGS_ID)) map.removeSource(DRAWN_BUILDINGS_ID);
      } catch {
        // The map may already be destroyed when the layer unmounts.
      }
    };
  }, [map]);

  React.useEffect(() => {
    void (map?.getSource(DRAWN_BUILDINGS_ID) as GeoJSONSource | undefined)?.setData(footprints);
  }, [map, footprints]);

  React.useEffect(() => {
    if (!map?.getLayer(DRAWN_BUILDINGS_ID)) return;
    map.setLayoutProperty(DRAWN_BUILDINGS_ID, "visibility", show3dBuildings ? "visible" : "none");
  }, [map, show3dBuildings]);

  React.useEffect(() => {
    if (!mapClickManager) return;

    const resolvePopups = (e: MapMouseEvent, hits: MapGeoJSONFeature[]): PopupEntry[] => {
      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      return hits.map((hit) => {
        const { dbId, name } = hit.properties ?? {};
        const feature = Object.assign(hit, { properties: { ...hit.properties, coordinates, isBuilding: true, isDbBuilding: true } });
        return buildingPopupEntry({
          layerId: DRAWN_BUILDINGS_ID,
          key: String(dbId),
          title: (name as string | null) || fallbackName,
          coordinates,
          feature,
          onClose: onClosePopup,
        });
      });
    };

    mapClickManager.register(DRAWN_BUILDINGS_ID, MapLayerClickPriority.BuildingLayersClickPriority, resolvePopups);
    return () => mapClickManager.unregister(DRAWN_BUILDINGS_ID);
  }, [mapClickManager, fallbackName, onClosePopup]);

  return null;
}
