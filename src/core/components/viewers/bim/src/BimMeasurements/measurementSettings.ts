// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Settings and snap tuning for the BIM measurement tools.
 *
 * Deliberately free of any `@thatopen` runtime import so it stays cheap to
 * unit test (see TESTING.md, "extract pure helpers"). The manager maps
 * {@link SnapClassName} onto `FRAGS.SnappingClass` in one place.
 */

/** The four measurement components exposed by the measure toolbar. */
export type BimMeasureKind = 'length' | 'area' | 'volume' | 'angle'

/**
 * Union of every mode across all four kinds. `LengthMeasurement` offers
 * free/edge, `AreaMeasurement` free/square/face, and volume/angle only free.
 */
export type BimMeasureMode = 'free' | 'edge' | 'square' | 'face'

/** Snap class, named so this module needs no `@thatopen/fragments` import. */
export type SnapClassName = 'point' | 'line' | 'face'

export type LengthUnits = 'mm' | 'cm' | 'm' | 'km'
export type AreaUnits = 'mm2' | 'cm2' | 'm2' | 'km2'
export type VolumeUnits = 'mm3' | 'cm3' | 'm3' | 'km3'
export type AngleUnits = 'deg' | 'rad'

export interface BimMeasurementSettings {
  /** Line, fill and label colour, as a CSS hex string. */
  colour: string
  /** Decimal places shown on measurement labels. */
  rounding: number
  lengthUnits: LengthUnits
  areaUnits: AreaUnits
  volumeUnits: VolumeUnits
  angleUnits: AngleUnits
  /**
   * World-space distance within which a vertex, edge or face counts as a snap
   * candidate, in model units (metres for typical BIM). Drives the shared
   * `OBC.SnapResolvers` resolver.
   *
   * Note: `Measurement.snapDistance` looks like the knob for this but is dead
   * in components-front 3.4.3 — its setter writes
   * `GraphicVertexPicker.maxDistance`, which `GraphicVertexPicker.get()` never
   * reads.
   */
  snapRange: number
  /** Edge length of the square snap marker, in CSS pixels. */
  markerSize: number
}

/**
 * Tuned away from the library defaults to fix the jumpy snapping. See
 * docs/superpowers/specs/2026-07-28-bim-measurement-tools-design.md for the
 * measurements behind each value.
 */
export const DEFAULT_MEASUREMENT_SETTINGS: BimMeasurementSettings = {
  colour: '#73cee2',
  rounding: 2,
  lengthUnits: 'm',
  areaUnits: 'm2',
  volumeUnits: 'm3',
  angleUnits: 'deg',
  // Library default is 1. A narrower window means fewer competing candidates
  // and so a marker that settles instead of flipping between them.
  snapRange: 0.5,
  // Library default is 6, which is too small to aim with.
  markerSize: 10,
}

/**
 * Milliseconds the cursor must be still before a snap pick runs.
 *
 * We put every measurer in `MeasurementPickMode.MOUSE_STOP`, so this is the
 * whole responsiveness budget. The library default of 300 ms reads as lag.
 */
export const MEASUREMENT_PICK_DELAY = 120

/**
 * Pixels of cursor travel before the marker lets go of a snap point and
 * resumes tracking the cursor. Library default is 12; a little more keeps the
 * marker on target through hand tremor.
 */
export const MEASUREMENT_STICKY_RADIUS_PX = 16

/**
 * Snap classes a given kind/mode should consider.
 *
 * The library defaults every measurer to `[LINE, POINT, FACE]`. All three
 * compete on each pick and the nearest wins, so the snap target flips between
 * three different answers as the cursor moves — that is the glitchiness. One
 * or two classes per mode gives a marker that holds still.
 *
 * Returns `undefined` for volume, which picks whole items rather than features
 * inside them; `VolumeMeasurement` overrides `snappings` to `undefined` to skip
 * the SnapResolver hop entirely.
 */
export function snapClassesFor(
  kind: BimMeasureKind,
  mode: BimMeasureMode,
): SnapClassName[] | undefined {
  if (kind === 'volume') return undefined

  // Edge mode measures along an edge, so a vertex or face candidate can only
  // pull the pick off the edge the user is aiming at.
  if (kind === 'length' && mode === 'edge') return ['line']

  // Face mode consumes the picked face's polygon, so it needs FACE and nothing
  // else — a vertex or edge hit yields no `facePoints` and the pick is dropped.
  if (kind === 'area' && mode === 'face') return ['face']

  return ['point', 'line']
}

/** The unit string to apply to a measurer of the given kind. */
export function unitsFor(
  kind: BimMeasureKind,
  settings: BimMeasurementSettings,
): LengthUnits | AreaUnits | VolumeUnits | AngleUnits {
  switch (kind) {
    case 'length':
      return settings.lengthUnits
    case 'area':
      return settings.areaUnits
    case 'volume':
      return settings.volumeUnits
    case 'angle':
      return settings.angleUnits
  }
}

/** Modes each kind actually supports, for validating toolbar wiring. */
export const MODES_BY_KIND: Record<BimMeasureKind, BimMeasureMode[]> = {
  length: ['free', 'edge'],
  area: ['free', 'square', 'face'],
  volume: ['free'],
  angle: ['free'],
}
