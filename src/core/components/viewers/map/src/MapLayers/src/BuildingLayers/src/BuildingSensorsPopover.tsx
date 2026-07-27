"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { useBuildingsContext, useMenusContext } from "../../../../../../../../store";
import { ViewerNames } from "../../../../../../../../types/dbTypes";
import { formatInZone } from "../../../../../../../../utils/timeUtils";
import { Badge } from "../../../../../../../ui/Badge";
import { Button } from "../../../../../../../ui/Button";
import { PopoverContent } from "../../../../../../../ui/Popover";
import { resolveLucideIcon } from "../../../../../../../ui/Sensors/sensorUtils";
import { Separator } from "../../../../../../../ui/Separator";

import type { Building, Sensor, SensorType } from "../../../../../../../../types/dbTypes";
import type { BuildingSensorAverage } from "../../../../../../../ui/Sensors/buildingSensorColours";
import type { SensorReading } from "../../../../../../../ui/Sensors/sensorValueColours";

const valueNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

/** `Air_Quality` reads as `Air Quality`, matching the legend and the cards. */
const typeLabel = (name: string): string => String(name).replace(/_/g, " ");

export interface BuildingSensorsPopoverProps {
  building: Building;
  sensorType: SensorType;
  sensors: Sensor[];
  readings: ReadonlyMap<number, SensorReading>;
  average?: BuildingSensorAverage;
  /** Latest reading time across the building's sensors, epoch ms. */
  latestAt?: number;
  unit?: string;
  timeZone: string;
  onCloseAction: () => void;
}

/**
 * What one building contributes to the sensor colouring, opened from its count badge.
 *
 * The average shown here is the number that tinted the footprint, so the popover doubles as the
 * explanation for the colour rather than just a list. Rows are clickable because focus is
 * global: picking one moves the legend caret, the marker halos and the detail charts together.
 */
export function BuildingSensorsPopover({
  building,
  sensorType,
  sensors,
  readings,
  average,
  latestAt,
  unit,
  timeZone,
  onCloseAction,
}: BuildingSensorsPopoverProps): React.ReactElement {
  const t = useTranslations("BuildingSensors");
  const { dispatch: menusDispatch, setSelectedItem } = useMenusContext();
  const { dispatch: buildingsDispatch } = useBuildingsContext();

  const TypeIcon = resolveLucideIcon(sensorType.icon);

  const formatValue = (value: number): string =>
    `${valueNumber.format(value)}${unit ? ` ${unit}` : ""}`;

  const focusSensor = (sensorId: number) => {
    menusDispatch({ type: "SET_FOCUSED_SENSOR_ID", payload: { sensorId } });
  };

  // Same state-driven navigation BuildingTools uses: set the current building, then the viewer.
  // Viewer.tsx mirrors both into the URL.
  const openBimViewer = () => {
    buildingsDispatch({ type: "SET-CURRENT-BUILDING", payload: { building } });
    setSelectedItem(building);
    menusDispatch({ type: "SET_VIEWER", payload: { currentViewer: ViewerNames.bim } });
    onCloseAction();
  };

  const openBuildingPage = () => {
    buildingsDispatch({ type: "SET-CURRENT-BUILDING", payload: { building } });
    setSelectedItem(building);
    menusDispatch({ type: "SET_VIEWER", payload: { currentViewer: ViewerNames.buildings } });
    onCloseAction();
  };

  const reporting = sensors.filter(s => readings.has(s.id)).length;

  return (
    <PopoverContent className="w-72 -m-1" side="top">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TypeIcon size={14} className="shrink-0 opacity-70" />
            <span className="truncate text-sm font-medium">{typeLabel(sensorType.name)}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {building.buildingName ?? t("untitledBuilding")}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCloseAction} aria-label={t("close")}>
          <LR.X size={14} />
        </Button>
      </div>

      {/* The number that tinted the footprint, next to the colour it produced. */}
      {average && (
        <div className="mt-3 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 rounded-full border"
            style={{ backgroundColor: average.colour }}
          />
          <span className="text-lg font-semibold tabular-nums">{formatValue(average.average)}</span>
          <span className="text-xs text-muted-foreground">{t("average")}</span>
        </div>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{t("reporting", { reporting, total: sensors.length })}</Badge>
        {latestAt != null && (
          <span>
            {t("updated", {
              time: formatInZone(latestAt, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
            })}
          </span>
        )}
      </div>

      <Separator className="my-3" />

      <ul className="max-h-48 space-y-0.5 overflow-y-auto">
        {sensors.map(sensor => {
          const reading = readings.get(sensor.id);
          return (
            <li key={sensor.id}>
              <button
                type="button"
                onClick={() => focusSensor(sensor.id)}
                className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs hover:bg-accent"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full border"
                  style={{ backgroundColor: reading?.colour ?? "transparent" }}
                />
                <span className="min-w-0 flex-1 truncate">{sensor.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {reading ? formatValue(reading.value) : t("noReading")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Separator className="my-3" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-sm border-2 border-gray-200 inline-flex justify-center items-center"
          title={t("openBimViewer")}
          aria-label={t("openBimViewer")}
          onClick={openBimViewer}
        >
          <LR.Box size={16} />
        </Button>
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-sm border-2 border-gray-200 inline-flex justify-center items-center"
          title={t("openBuildingPage")}
          aria-label={t("openBuildingPage")}
          onClick={openBuildingPage}
        >
          <LR.Building2 size={16} />
        </Button>
      </div>
    </PopoverContent>
  );
}
