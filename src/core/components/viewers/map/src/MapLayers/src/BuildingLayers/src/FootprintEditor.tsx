"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { useBuilding } from "../../../../../../../../hooks/buildings/buildings";
import { MapContext } from "../../../../../../../../store/Map/context";
import { usePolygonDraw } from "../../../../tools/AddTools/shared/usePolygonDraw";
import { polygonCentroid } from "../../SiteLayer/siteGeometry";
import { buildingGeometryToRing, ringToBuildingGeometry } from "../buildingGeometry";

import type { Ring } from "../../SiteLayer/siteGeometry";

const EDIT_TOAST_ID = "footprint-editor";

/** Reshapes the footprint of the building named by the map store's `editingFootprint`. */
export function FootprintEditor() {
  const t = useTranslations("FootprintEditor");
  const { state: mapState, dispatch: mapDispatch } = React.useContext(MapContext);
  const { map, mapClickManager, editingFootprint } = mapState.map;
  const buildingId = editingFootprint?.buildingId ?? null;
  const { building, updateBuilding } = useBuilding(buildingId);
  const startedForRef = React.useRef<number | null>(null);

  const stopEditing = React.useCallback(() => {
    mapDispatch({ type: "SET_EDITING_FOOTPRINT", payload: { editingFootprint: null } });
  }, [mapDispatch]);

  const save = async (ring: Ring) => {
    const toastId = toast.loading(t("saving"));
    try {
      const [lng, lat] = polygonCentroid(ring);
      await updateBuilding({ buildingGeometry: ringToBuildingGeometry(ring), buildingLongitude: lng, buildingLatitude: lat });
      toast.success(t("saved"), { id: toastId });
      stopEditing();
    }
    catch (error) {
      console.error("Failed to save the building footprint:", error);
      toast.error(t("saveFailed"), { id: toastId });
      throw error;
    }
  };

  const { start } = usePolygonDraw({
    map,
    mapClickManager,
    enabled: buildingId != null,
    toastId: EDIT_TOAST_ID,
    onFinish: save,
    onCancel: stopEditing,
    labels: {
      mapNotReady: t("mapNotReady"),
      cancelled: t("cancelled"),
      needThreePoints: t("needThreePoints"),
      title: t("title"),
      readyTitle: t("title"),
      hint: count => t("hint", { count }),
      readyHint: count => t("hint", { count }),
      finish: t("save"),
      cancel: t("cancel"),
    },
  });

  React.useEffect(() => {
    if (buildingId == null) {
      startedForRef.current = null;
      return;
    }
    if (startedForRef.current === buildingId || building?.id !== buildingId) return;
    startedForRef.current = buildingId;
    const ring = buildingGeometryToRing(building.buildingGeometry) ?? editingFootprint?.seedRing ?? [];
    if (!start(ring)) stopEditing();
  }, [buildingId, building, editingFootprint, start, stopEditing]);

  return null;
}
