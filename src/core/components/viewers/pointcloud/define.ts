// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// This is enum declaration file, taken from Potree Point Cloud Viewer
// https://github.com/potree/potree/blob/develop/src/defines.js

/** Camera projection / mode */
export const enum CameraMode {
  ORTHOGRAPHIC = 0,
  PERSPECTIVE = 1,
  VR = 2,
}

/** How clipping volumes affect rendering */
export const enum ClipTask {
  NONE = 0,
  HIGHLIGHT = 1,
  SHOW_INSIDE = 2,
  SHOW_OUTSIDE = 3,
}

/** Whether a point is kept if it's inside ANY or ALL clipping volumes */
export const enum ClipMethod {
  INSIDE_ANY = 0,
  INSIDE_ALL = 1,
}

/** Elevation shader gradient wrap mode */
export const enum ElevationGradientRepeat {
  CLAMP = 0,
  REPEAT = 1,
  MIRRORED_REPEAT = 2,
}

/** Mouse buttons as bit flags */
export const enum MOUSE {
  LEFT   = 0b0001,
  RIGHT  = 0b0010,
  MIDDLE = 0b0100,
}

/** Point size attenuation mode */
export const enum PointSizeType {
  FIXED = 0,
  ATTENUATED = 1,
  ADAPTIVE = 2,
}

/** Point sprite shape */
export const enum PointShape {
  SQUARE = 0,
  CIRCLE = 1,
  PARABOLOID = 2,
}

/** Acceleration structure type */
export const enum TreeType {
  OCTREE = 0,
  KDTREE = 1,
}

/**
 * Units: enum + metadata map (enums can’t hold object values).
 * Use LengthUnit for typing, and LENGTH_UNIT_META for code & scale.
 */
export const enum LengthUnit {
  METER = "METER",
  FEET = "FEET",
  INCH = "INCH",
}

export type LengthUnitInfo = {
  code: string;
  unitsPerMeter: number;
};

export const LENGTH_UNIT_META: Record<LengthUnit, LengthUnitInfo> = {
  [LengthUnit.METER]: { code: "m",  unitsPerMeter: 1.0 },
  [LengthUnit.FEET]:  { code: "ft", unitsPerMeter: 3.28084 },
  [LengthUnit.INCH]:  { code: "″",  unitsPerMeter: 39.3701 },
};

// (optional) helpers
export const metersTo = (valueInMeters: number, unit: LengthUnit) =>
  valueInMeters * LENGTH_UNIT_META[unit].unitsPerMeter;

export const toMeters = (value: number, unit: LengthUnit) =>
  value / LENGTH_UNIT_META[unit].unitsPerMeter;