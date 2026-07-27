"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { Marker, Popup } from "react-map-gl/maplibre";

import { AppConfigContext } from "../../../../../../../../store";
import { readableTextColour } from "../../../../../../../../utils/colourUtils";
import { Popover, PopoverTrigger } from "../../../../../../../ui/Popover";

import { BuildingSensorsPopover } from "./BuildingSensorsPopover";

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
 * The extrusion tint alone says "warmer than that one" but not how many readings back it, or
 * which ones; the badge carries the count and opens the breakdown. It exists only while a type
 * is pinned in the legend, so the map is unchanged until the user asks for it.
 */
export function BuildingSensorMarkers({
  buildings,
  sensorColours,
}: BuildingSensorMarkersProps): React.ReactElement | null {
  const { state: appConfigState } = React.useContext(AppConfigContext);
  const timeZone = appConfigState.appConfig.displayTimeZone;
  const [openBuildingId, setOpenBuildingId] = React.useState<number | null>(null);

  const { typeId, sensorType, averages, sensorsByBuilding, readings, latestAtByBuilding, unit } = sensorColours;

  const marked = React.useMemo(
    () => buildings.filter(building =>
      building.buildingLongitude != null
      && building.buildingLatitude != null
      && (sensorsByBuilding.get(building.id)?.length ?? 0) > 0),
    [buildings, sensorsByBuilding],
  );

  // Clearing the open building when the type changes stops a popover describing a type that is
  // no longer on screen.
  React.useEffect(() => { setOpenBuildingId(null); }, [typeId]);

  if (typeId == null || !sensorType) return null;

  const openBuilding = marked.find(b => b.id === openBuildingId);
  const openSensors = openBuilding ? sensorsByBuilding.get(openBuilding.id) ?? [] : [];

  return (
    <>
      {marked.map(building => {
        const sensors = sensorsByBuilding.get(building.id) ?? [];
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
            onClick={() => setOpenBuildingId(id => (id === building.id ? null : building.id))}
          >
            <button
              type="button"
              aria-label={`${sensors.length}`}
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
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {sensors.length}
            </button>
          </Marker>
        );
      })}

      {openBuilding && (
        <Popup
          anchor="bottom"
          closeButton={false}
          closeOnClick={false}
          key={`sensor-popup-${openBuilding.id}-${typeId}`}
          longitude={openBuilding.buildingLongitude as number}
          latitude={openBuilding.buildingLatitude as number}
          onClose={() => setOpenBuildingId(null)}
        >
          {/* The MapLibre popup does the positioning; the Radix trigger is only a mount point,
              matching how MapFeaturePopoverMenu hosts the building popovers. */}
          <Popover open onOpenChange={next => { if (!next) setOpenBuildingId(null); }}>
            <PopoverTrigger asChild><div /></PopoverTrigger>
            <BuildingSensorsPopover
              building={openBuilding}
              sensorType={sensorType}
              sensors={openSensors}
              readings={readings}
              average={averages.get(openBuilding.id)}
              latestAt={latestAtByBuilding.get(openBuilding.id)}
              unit={unit}
              timeZone={timeZone}
              onCloseAction={() => setOpenBuildingId(null)}
            />
          </Popover>
        </Popup>
      )}
    </>
  );
}
