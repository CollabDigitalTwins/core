// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import { mapBbox, type FlatBounds } from "../../../../../utils/validateBounds";

import type { Map } from "maplibre-gl";

const PADDING_RATIO = 0.5;

function paddedBounds(map: Map): FlatBounds {
  const [west, south, east, north] = mapBbox(map);
  const padLng = (east - west) * PADDING_RATIO;
  const padLat = (north - south) * PADDING_RATIO;
  return [west - padLng, south - padLat, east + padLng, north + padLat];
}

/** The camera's bounds padded by half a screen, refreshed when the camera settles; null below `minZoom`. */
export function useViewBounds(map: Map | null | undefined, minZoom: number): FlatBounds | null {
  const [bounds, setBounds] = React.useState<FlatBounds | null>(null);

  React.useEffect(() => {
    if (!map) return;
    const update = () => setBounds(map.getZoom() >= minZoom ? paddedBounds(map) : null);
    update();
    map.on("moveend", update);
    return () => { map.off("moveend", update); };
  }, [map, minZoom]);

  return bounds;
}
