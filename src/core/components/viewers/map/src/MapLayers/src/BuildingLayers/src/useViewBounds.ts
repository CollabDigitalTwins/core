// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import type { LngLatBounds } from "../drawnFootprints";
import type { Map } from "maplibre-gl";

const PADDING_RATIO = 0.5;

function paddedBounds(map: Map): LngLatBounds {
  const bounds = map.getBounds();
  const [west, south, east, north] = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
  const padLng = (east - west) * PADDING_RATIO;
  const padLat = (north - south) * PADDING_RATIO;
  return [west - padLng, south - padLat, east + padLng, north + padLat];
}

/** The camera's bounds padded by half a screen, refreshed when the camera settles; null below `minZoom`. */
export function useViewBounds(map: Map | null | undefined, minZoom: number): LngLatBounds | null {
  const [bounds, setBounds] = React.useState<LngLatBounds | null>(null);

  React.useEffect(() => {
    if (!map) return;
    const update = () => setBounds(map.getZoom() >= minZoom ? paddedBounds(map) : null);
    update();
    map.on("moveend", update);
    return () => { map.off("moveend", update); };
  }, [map, minZoom]);

  return bounds;
}
