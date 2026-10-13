// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PaintExpression } from "./buildingColourExpression";
import type { Building } from "../../../../../../../types/dbTypes";

// Some tiles carry the OSM id only as a property rather than as the MVT feature id, so both are tried.
const ID_KEY: PaintExpression = ["to-string", ["id"]];
const PROP_KEY: PaintExpression = ["to-string", ["coalesce", ["get", "osm_id"], ""]];

export function matchesOsmId(osmId: string): PaintExpression {
  return ["any", ["==", ID_KEY, osmId], ["==", PROP_KEY, osmId]];
}

export function matchesAnyOsmId(osmIds: readonly string[]): PaintExpression {
  return ["any", ["in", ID_KEY, ["literal", [...osmIds]]], ["in", PROP_KEY, ["literal", [...osmIds]]]];
}

/** A `match` on either OSM key over flattened `[osmId, output]` pairs; `fallback` alone when there are none. */
export function matchByOsmId(pairs: readonly (string | number)[], fallback: PaintExpression): PaintExpression {
  if (pairs.length === 0) return fallback;
  return ["match", ID_KEY, ...pairs, ["match", PROP_KEY, ...pairs, fallback]];
}

/** The building's OSM id as a `match` label; empty when it has none. */
export const osmLabel = (building: Pick<Building, "buildingOsmId">) => String(building.buildingOsmId ?? "").trim();

export const byOsmLabel = ([a]: readonly [string, unknown], [b]: readonly [string, unknown]) => (a < b ? -1 : a > b ? 1 : 0);
