"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { Marker } from "react-map-gl/maplibre";

import { readableTextColour } from "../../../../../../../../utils/colourUtils";
import { markerOcclusionProps } from "../../../../../../../../utils/markerUtils";

import type { Building } from "../../../../../../../../types/dbTypes";
import type { UseBuildingSensorColoursResult } from "../../../../../../../ui/Sensors/useBuildingSensorColours";

export interface BuildingSensorMarkersProps {
  buildings: Building[];
  sensorColours: UseBuildingSensorColoursResult;
}

/**
 * A count badge at the centre of every building that has sensors of the active type, filled with
 * the same average colour as its footprint.
 *
 * Read-only on purpose: it does not swallow the pointer, so clicking it clicks the footprint
 * underneath and opens the building popover, which is where the sensor readings are listed.
 * The extrusion tint alone says "warmer than that one" but not how many readings back it; the
 * badge carries that count, and the popover carries the breakdown.
 */
export function BuildingSensorMarkers({
  buildings,
  sensorColours,
}: BuildingSensorMarkersProps): React.ReactElement | null {
  const { typeId, sensorType, averages, sensorsByBuilding } = sensorColours;

  const marked = React.useMemo(
    () => buildings.filter(building =>
      building.buildingLongitude != null
      && building.buildingLatitude != null
      && (sensorsByBuilding.get(building.id)?.length ?? 0) > 0),
    [buildings, sensorsByBuilding],
  );

  if (typeId == null || !sensorType) return null;

  return (
    <>
      {marked.map(building => {
        const count = sensorsByBuilding.get(building.id)?.length ?? 0;
        const average = averages.get(building.id);
        // No average means no usable domain or nothing reporting yet: the badge still counts the
        // sensors, it just cannot claim a colour for them.
        const background = average?.colour ?? "hsl(var(--muted))";
        return (
          <Marker
            key={`sensor-count-${building.id}`}
            longitude={building.buildingLongitude as number}
            latitude={building.buildingLatitude as number}
            anchor="center"
            style={{ pointerEvents: "none" }}
            {...markerOcclusionProps}
          >
            <div
              aria-hidden="true"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                border: "2px solid white",
                backgroundColor: background,
                color: average ? readableTextColour(average.colour) : "hsl(var(--foreground))",
                boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                fontSize: "12px",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {count}
            </div>
          </Marker>
        );
      })}
    </>
  );
}
