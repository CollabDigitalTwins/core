"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "../../../../../../../../components/ui/";
import { AppConfigContext, MenusContext } from "../../../../../../../../store";
import { formatInZone } from "../../../../../../../../utils/timeUtils";

import type { Sensor, SensorType } from "../../../../../../../../types/dbTypes";
import type { BuildingSensorAverage } from "../../../../../../../ui/Sensors/buildingSensorColours";
import type { SensorReading } from "../../../../../../../ui/Sensors/sensorValueColours";

const valueNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

/** `Air_Quality` reads as `Air Quality`, matching the legend and the cards. */
const typeLabel = (name: string): string => String(name).replace(/_/g, " ");

/** Rows shown before the list starts scrolling. */
const MAX_VISIBLE_SENSORS = 10;
/** One row at text-xs with py-1 padding and the list's 2px gap. */
const ROW_HEIGHT_PX = 26;

const formatter = (unit?: string) => (value: number): string =>
  `${valueNumber.format(value)}${unit ? ` ${unit}` : ""}`;

export interface BuildingSensorSummaryProps {
  sensorType: SensorType;
  sensors: Sensor[];
  readings: ReadonlyMap<number, SensorReading>;
  average?: BuildingSensorAverage;
  /** Most recent reading time across these sensors, epoch ms. */
  latestAt?: number;
  unit?: string;
}

/**
 * The one number behind this building's footprint colour, plus how much data is standing behind
 * it.
 *
 * Rendered outside the popover's collapsible section: with the map tinted by sensor data, this
 * is the thing the card is being opened to read, so it should not need a second click.
 *
 * Presentational: the caller owns the data, so the poll behind it stays a single one.
 */
export function BuildingSensorSummary({
  sensorType,
  sensors,
  readings,
  average,
  latestAt,
  unit,
}: BuildingSensorSummaryProps): React.ReactElement {
  const t = useTranslations("BuildingSensors");
  const { state: appConfigState } = React.useContext(AppConfigContext);
  const timeZone = appConfigState.appConfig.displayTimeZone;
  const formatValue = formatter(unit);

  const reporting = sensors.filter(s => readings.has(s.id)).length;

  return (
    <div className="mt-1 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground font-medium">{typeLabel(sensorType.name)}</p>
      {average && (
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 rounded-full border"
            style={{ backgroundColor: average.colour }}
          />
          <span className="text-base font-semibold tabular-nums">{formatValue(average.average)}</span>
          <span className="text-xs text-muted-foreground">{t("average")}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{t("reporting", { reporting, total: sensors.length })}</Badge>
        {latestAt != null && (
          <span>
            {t("updated", {
              time: formatInZone(latestAt, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
            })}
          </span>
        )}
      </div>
    </div>
  );
}

export interface BuildingSensorListProps {
  sensors: Sensor[];
  readings: ReadonlyMap<number, SensorReading>;
  unit?: string;
}

/**
 * The individual sensors behind the average, for the popover's expandable section.
 *
 * Caps at ten rows and scrolls past that, so a building with a large array does not push the
 * tool row off the bottom of the card.
 */
export function BuildingSensorList({
  sensors,
  readings,
  unit,
}: BuildingSensorListProps): React.ReactElement {
  const t = useTranslations("BuildingSensors");
  const { dispatch: menusDispatch } = React.useContext(MenusContext);
  const formatValue = formatter(unit);

  return (
    <ul
      className="mt-2 space-y-0.5 overflow-y-auto"
      style={sensors.length > MAX_VISIBLE_SENSORS
        ? { maxHeight: MAX_VISIBLE_SENSORS * ROW_HEIGHT_PX }
        : undefined}
    >
      {sensors.map(sensor => {
        const reading = readings.get(sensor.id);
        return (
          <li key={sensor.id}>
            {/* Focus is global, so picking one here moves the legend caret, the marker halos
                and the detail charts together. */}
            <button
              type="button"
              onClick={() => menusDispatch({
                type: "SET_FOCUSED_SENSOR_ID",
                payload: { sensorId: sensor.id },
              })}
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
  );
}
