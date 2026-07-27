// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { highlightColor } from "../../../../../../../types/martinTypes";
import { lerpHex } from "../../../../../../../utils/colourUtils";

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

/** How far a sensor-coloured footprint is lifted toward white on hover. */
const HOVER_LIFT = 0.18;

// Two ways the same footprint identifies itself. The MVT feature id is usually the OSM id, but
// some tiles carry it only as a property, so both are tried. Copied from the height expression,
// which already proves the pair parses against these tiles.
const ID_KEY: PaintExpression = ["to-string", ["id"]];
const PROP_KEY: PaintExpression = ["to-string", ["coalesce", ["get", "osm_id"], ""]];

/** Matches a footprint by either key, mirroring `buildHeightExpression`. */
function matchesKey(key: string): PaintExpression {
  return ["any", ["==", ID_KEY, key], ["==", PROP_KEY, key]];
}

/**
 * `[osmId, colour]` pairs ready for a MapLibre `match`, joining sensor averages (keyed by DB
 * building id) to the tile-side OSM ids.
 *
 * Deduped and sorted, both load-bearing: MapLibre rejects a `match` with duplicate labels, which
 * would throw out of `setPaintProperty` and leave the layer on a stale expression, and a stable
 * order keeps the expression identical between renders that resolved the same colours.
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
    // An empty label would match every feature whose id stringifies to "", i.e. every id-less
    // building, so a building with no OSM id simply cannot be coloured.
    const osmId = String(building.buildingOsmId ?? "").trim();
    if (!osmId || seen.has(osmId)) continue;
    seen.add(osmId);
    entries.push([osmId, average.colour]);
  }

  return entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

/**
 * The layer's `fill-extrusion-color`: hover and click highlights first, then the sensor colour,
 * then the tile default.
 *
 * With no colours to apply this returns the default expression unchanged, so the feature being
 * off reproduces the layer's original paint exactly.
 */
export function buildingColourExpression({
  osmColours,
  clickedKey,
  hoveredKey,
}: {
  osmColours: readonly (readonly [string, string])[];
  clickedKey?: string | number | null;
  hoveredKey?: string | number | null;
}): PaintExpression {
  // `match` needs at least one label/output pair, so an empty set short-circuits. The id lookup
  // falls back to the property lookup, which falls back to the tile default.
  let lookup: PaintExpression = DEFAULT_COLOUR_EXPRESSION;
  if (osmColours.length > 0) {
    const pairs = osmColours.flatMap(([osmId, colour]) => [osmId, colour]);
    lookup = ["match", ID_KEY, ...pairs, ["match", PROP_KEY, ...pairs, DEFAULT_COLOUR_EXPRESSION]];
  }

  const branches: PaintExpression = [];
  const clicked = clickedKey == null ? "" : String(clickedKey);
  const hovered = hoveredKey == null ? "" : String(hoveredKey);
  if (clicked) branches.push(matchesKey(clicked), highlightColor);
  if (hovered) {
    // Flat grey would throw away the reading the footprint is carrying, so a sensor-coloured
    // building is lifted toward white instead: still obvious feedback, still the same value.
    // Buildings with no sensor colour keep the original grey.
    const sensorColour = osmColours.find(([osmId]) => osmId === hovered)?.[1];
    branches.push(
      matchesKey(hovered),
      sensorColour ? lerpHex(sensorColour, "#ffffff", HOVER_LIFT) : HOVER_COLOUR,
    );
  }

  if (branches.length === 0) return lookup;
  return ["case", ...branches, lookup];
}
