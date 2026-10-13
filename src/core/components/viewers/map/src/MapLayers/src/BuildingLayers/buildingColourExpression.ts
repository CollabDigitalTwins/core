// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { highlightColor } from "../../../../../../../types/martinTypes";
import { lerpHex } from "../../../../../../../utils/colourUtils";

import { byOsmLabel, matchByOsmId, matchesAnyOsmId, matchesOsmId, osmLabel } from "./osmIdExpression";

import type { Building } from "../../../../../../../types/dbTypes";
import type { BuildingSensorAverage } from "../../../../../../ui/Sensors/buildingSensorColours";

/**
 * JSON form of a MapLibre expression. Declared structurally so this module needs no maplibre
 * import and its test stays in the node environment.
 */
export type PaintExpression = (string | number | boolean | null | PaintExpression)[];

/** Colour a footprint gets with nothing else to say about it: the tile's own, else grey. */
export const DEFAULT_COLOUR_EXPRESSION: PaintExpression = ["coalesce", ["get", "colour"], "#cccccc"];

export const HOVER_COLOUR = "#e0e0e0";

/** Lighter than the default grey so footprints tied to a database building stand out. */
export const ASSIGNED_COLOUR = "#f0f0f0";

/** How far a sensor-coloured footprint is lifted toward white on hover. */
const HOVER_LIFT = 0.18;

function fallbackColour(assignedOsmIds: readonly string[]): PaintExpression {
  if (assignedOsmIds.length === 0) return DEFAULT_COLOUR_EXPRESSION;
  return ["case", matchesAnyOsmId(assignedOsmIds), ASSIGNED_COLOUR, DEFAULT_COLOUR_EXPRESSION];
}

/**
 * `[osmId, colour]` pairs joining sensor averages to tile OSM ids. Deduped because MapLibre
 * rejects a `match` with duplicate labels; sorted so equal inputs yield an identical expression.
 */
export function osmColourEntries(
  averages: ReadonlyMap<number, BuildingSensorAverage>,
  buildings: readonly Pick<Building, "id" | "buildingOsmId">[],
): [string, string][] {
  const seen = new Set<string>();
  const entries: [string, string][] = [];

  for (const building of buildings) {
    const average = averages.get(building.id);
    if (!average) continue;
    // An empty label would match every id-less footprint.
    const osmId = osmLabel(building);
    if (!osmId || seen.has(osmId)) continue;
    seen.add(osmId);
    entries.push([osmId, average.colour]);
  }

  return entries.sort(byOsmLabel);
}

/**
 * The layer's `fill-extrusion-color`: click and hover highlights, then sensor colour, then the
 * assigned grey, then the tile default — which is returned unchanged when nothing applies.
 */
export function buildingColourExpression({
  osmColours,
  assignedOsmIds = [],
  clickedKey,
  hoveredKey,
}: {
  osmColours: readonly (readonly [string, string])[];
  assignedOsmIds?: readonly string[];
  clickedKey?: string | number | null;
  hoveredKey?: string | number | null;
}): PaintExpression {
  const lookup = matchByOsmId(osmColours.flat(), fallbackColour(assignedOsmIds));

  const branches: PaintExpression = [];
  const clicked = clickedKey == null ? "" : String(clickedKey);
  const hovered = hoveredKey == null ? "" : String(hoveredKey);
  if (clicked) branches.push(matchesOsmId(clicked), highlightColor);
  if (hovered) {
    // Lifted rather than flat grey so a sensor-coloured footprint keeps showing its reading.
    const sensorColour = osmColours.find(([osmId]) => osmId === hovered)?.[1];
    branches.push(
      matchesOsmId(hovered),
      sensorColour ? lerpHex(sensorColour, "#ffffff", HOVER_LIFT) : HOVER_COLOUR,
    );
  }

  if (branches.length === 0) return lookup;
  return ["case", ...branches, lookup];
}
