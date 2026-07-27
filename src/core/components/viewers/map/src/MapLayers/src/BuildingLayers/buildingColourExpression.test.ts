// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from "vitest";

import { highlightColor } from "../../../../../../../types/martinTypes";

import {
  buildingColourExpression,
  DEFAULT_COLOUR_EXPRESSION,
  HOVER_COLOUR,
  osmColourEntries,
} from "./buildingColourExpression";

import type { BuildingSensorAverage } from "../../../../../../ui/Sensors/buildingSensorColours";

const average = (buildingId: number, colour: string): BuildingSensorAverage =>
  ({ buildingId, colour, average: 0, sensorCount: 1 });

const building = (id: number, buildingOsmId: string | undefined) =>
  ({ id, buildingOsmId });

describe("osmColourEntries", () => {
  it("joins averages to OSM ids", () => {
    const entries = osmColourEntries(
      new Map([[1, average(1, "#ff0000")]]),
      [building(1, "123")],
    );
    expect(entries).toEqual([["123", "#ff0000"]]);
  });

  it("skips buildings with no average", () => {
    const entries = osmColourEntries(new Map(), [building(1, "123")]);
    expect(entries).toEqual([]);
  });

  it("skips buildings with a missing or blank OSM id", () => {
    const entries = osmColourEntries(
      new Map([[1, average(1, "#ff0000")], [2, average(2, "#00ff00")]]),
      [building(1, undefined), building(2, "  ")],
    );
    expect(entries).toEqual([]);
  });

  it("dedupes a repeated OSM id so MapLibre does not reject the match", () => {
    const entries = osmColourEntries(
      new Map([[1, average(1, "#ff0000")], [2, average(2, "#00ff00")]]),
      [building(1, "123"), building(2, "123")],
    );
    expect(entries).toEqual([["123", "#ff0000"]]);
  });

  it("orders deterministically regardless of input order", () => {
    const averages = new Map([[1, average(1, "#ff0000")], [2, average(2, "#00ff00")]]);
    const forwards = osmColourEntries(averages, [building(1, "111"), building(2, "222")]);
    const backwards = osmColourEntries(averages, [building(2, "222"), building(1, "111")]);
    expect(forwards).toEqual(backwards);
  });
});

describe("buildingColourExpression", () => {
  it("reproduces the layer default when there is nothing to colour", () => {
    expect(buildingColourExpression({ osmColours: [] })).toEqual(DEFAULT_COLOUR_EXPRESSION);
  });

  it("looks a colour up by feature id, then by the osm_id property", () => {
    expect(buildingColourExpression({ osmColours: [["123", "#ff0000"]] })).toEqual([
      "match", ["to-string", ["id"]], "123", "#ff0000",
      [
        "match", ["to-string", ["coalesce", ["get", "osm_id"], ""]], "123", "#ff0000",
        DEFAULT_COLOUR_EXPRESSION,
      ],
    ]);
  });

  it("puts click before hover before the sensor colour", () => {
    const expr = buildingColourExpression({
      osmColours: [["123", "#ff0000"]],
      clickedKey: "900",
      hoveredKey: "901",
    });
    expect(expr[0]).toBe("case");
    expect(expr[2]).toBe(highlightColor);
    expect(expr[4]).toBe(HOVER_COLOUR);
    expect(expr[5]).toEqual(expect.arrayContaining(["match"]));
  });

  it("matches a highlighted footprint by either key", () => {
    const expr = buildingColourExpression({ osmColours: [], clickedKey: 900 });
    expect(expr[1]).toEqual([
      "any",
      ["==", ["to-string", ["id"]], "900"],
      ["==", ["to-string", ["coalesce", ["get", "osm_id"], ""]], "900"],
    ]);
  });

  it("lets a highlight win over that building's sensor colour", () => {
    const expr = buildingColourExpression({ osmColours: [["123", "#ff0000"]], clickedKey: "123" });
    // The clicked branch is evaluated first, so the sensor colour never applies.
    expect(expr[2]).toBe(highlightColor);
  });

  it("lifts a sensor-coloured footprint toward white on hover instead of greying it", () => {
    const expr = buildingColourExpression({ osmColours: [["123", "#000000"]], hoveredKey: "123" });
    // 18% of the way from black to white, so the reading survives the hover feedback.
    expect(expr[2]).toBe("#2e2e2e");
  });

  it("keeps the plain grey hover for a footprint with no sensor colour", () => {
    const expr = buildingColourExpression({ osmColours: [["123", "#000000"]], hoveredKey: "999" });
    expect(expr[2]).toBe(HOVER_COLOUR);
  });

  it("emits no branch for an absent or empty highlight key", () => {
    expect(buildingColourExpression({ osmColours: [], hoveredKey: null }))
      .toEqual(DEFAULT_COLOUR_EXPRESSION);
    expect(buildingColourExpression({ osmColours: [], hoveredKey: "" }))
      .toEqual(DEFAULT_COLOUR_EXPRESSION);
  });
});
