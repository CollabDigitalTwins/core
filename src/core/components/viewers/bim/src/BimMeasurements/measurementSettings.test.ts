// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MEASUREMENT_SETTINGS,
  MODES_BY_KIND,
  snapClassesFor,
  unitsFor,
} from './measurementSettings'

import type { BimMeasureKind, BimMeasurementSettings } from './measurementSettings'

describe('snapClassesFor', () => {
  it('restricts edge length measurement to line snaps', () => {
    // A vertex or face candidate can only pull the pick off the edge the user
    // is aiming at.
    expect(snapClassesFor('length', 'edge')).toEqual(['line'])
  })

  it('restricts face area measurement to face snaps', () => {
    // Face mode reads the picked face's polygon; a vertex or edge hit yields no
    // facePoints and the pick is dropped.
    expect(snapClassesFor('area', 'face')).toEqual(['face'])
  })

  it('uses point and line snaps for free-form picking', () => {
    expect(snapClassesFor('length', 'free')).toEqual(['point', 'line'])
    expect(snapClassesFor('area', 'free')).toEqual(['point', 'line'])
    expect(snapClassesFor('area', 'square')).toEqual(['point', 'line'])
    expect(snapClassesFor('angle', 'free')).toEqual(['point', 'line'])
  })

  it('returns undefined for volume regardless of mode', () => {
    // VolumeMeasurement picks whole items and overrides snappings to undefined
    // to skip the SnapResolver hop. Handing it classes would be meaningless.
    expect(snapClassesFor('volume', 'free')).toBeUndefined()
  })

  it('never returns all three classes, which is what causes marker flip', () => {
    for (const [kind, modes] of Object.entries(MODES_BY_KIND)) {
      for (const mode of modes) {
        const classes = snapClassesFor(kind as BimMeasureKind, mode)
        expect(classes?.length ?? 0).toBeLessThan(3)
      }
    }
  })

  it('covers every mode each kind advertises', () => {
    for (const [kind, modes] of Object.entries(MODES_BY_KIND)) {
      for (const mode of modes) {
        const classes = snapClassesFor(kind as BimMeasureKind, mode)
        if (kind === 'volume') {
          expect(classes).toBeUndefined()
        } else {
          expect(classes).not.toHaveLength(0)
        }
      }
    }
  })
})

describe('unitsFor', () => {
  it('maps each kind to its own unit field', () => {
    const settings: BimMeasurementSettings = {
      ...DEFAULT_MEASUREMENT_SETTINGS,
      lengthUnits: 'cm',
      areaUnits: 'cm2',
      volumeUnits: 'cm3',
      angleUnits: 'rad',
    }

    expect(unitsFor('length', settings)).toBe('cm')
    expect(unitsFor('area', settings)).toBe('cm2')
    expect(unitsFor('volume', settings)).toBe('cm3')
    expect(unitsFor('angle', settings)).toBe('rad')
  })

  it('defaults to metric base units', () => {
    expect(unitsFor('length', DEFAULT_MEASUREMENT_SETTINGS)).toBe('m')
    expect(unitsFor('area', DEFAULT_MEASUREMENT_SETTINGS)).toBe('m2')
    expect(unitsFor('volume', DEFAULT_MEASUREMENT_SETTINGS)).toBe('m3')
    expect(unitsFor('angle', DEFAULT_MEASUREMENT_SETTINGS)).toBe('deg')
  })
})

describe('DEFAULT_MEASUREMENT_SETTINGS', () => {
  it('narrows the snap range below the library default of 1', () => {
    expect(DEFAULT_MEASUREMENT_SETTINGS.snapRange).toBeLessThan(1)
    expect(DEFAULT_MEASUREMENT_SETTINGS.snapRange).toBeGreaterThan(0)
  })

  it('enlarges the marker beyond the library default of 6', () => {
    expect(DEFAULT_MEASUREMENT_SETTINGS.markerSize).toBeGreaterThan(6)
  })
})
