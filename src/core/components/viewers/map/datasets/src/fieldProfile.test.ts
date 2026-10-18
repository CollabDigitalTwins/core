// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { isIdName, isStylableField, profileFields, propertyNormaliser } from './fieldProfile'

import type { Feature } from 'geojson'

const features = (rows: Record<string, unknown>[]): Feature[] =>
  rows.map(properties => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties }))

const byName = (rows: Record<string, unknown>[]) => Object.fromEntries(profileFields(features(rows)).fields.map(p => [p.name, p]))

describe('profileFields', () => {
  it('infers types from values, including formatted numbers stored as text', () => {
    const profiles = byName([
      { cost: '$1,200', open: 'yes', sport: 'Tennis', built: '2021-05-01' },
      { cost: '300', open: 'no', sport: 'Basketball', built: '2019-01-12' },
    ])
    expect(profiles.cost).toMatchObject({ type: 'number', min: 300, max: 1200 })
    expect(profiles.open.type).toBe('boolean')
    expect(profiles.sport.type).toBe('string')
    expect(profiles.built.type).toBe('datetime')
  })

  it('orders distinct values by frequency and counts blanks', () => {
    const { sport } = byName([{ sport: 'Tennis' }, { sport: 'Soccer' }, { sport: 'Tennis' }, { sport: '' }])
    expect(sport.distinctValues).toEqual(['Tennis', 'Soccer'])
    expect(sport.nullCount).toBe(1)
  })

  it('keeps provider aliases and lets a datetime hint win over raw epoch numbers', () => {
    const { fields: [field] } = profileFields(features([{ updated: 1700000000000 }]), [{ name: 'updated', type: 'datetime', alias: 'Updated' }])
    expect(field).toMatchObject({ type: 'datetime', alias: 'Updated' })
  })
})

describe('id detection', () => {
  it('flags id-like names but not words that merely end in "id"', () => {
    expect(['OBJECTID', 'FID', '_id', 'GlobalID', 'parcel_id', 'id_lot'].every(isIdName)).toBe(true)
    expect(['paid', 'humid', 'valid', 'idle'].some(isIdName)).toBe(false)
  })

  it('flags unique sequential integers and uuids as ids', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ seq: i + 1, ref: `${i.toString(16).padStart(8, '0')}-0000-0000-0000-000000000000` }))
    const profiles = byName(rows)
    expect(profiles.seq.isId).toBe(true)
    expect(profiles.ref.isId).toBe(true)
  })

  it('leaves ids, coordinates and empty fields out of styling', () => {
    const profiles = byName([{ OBJECTID: 1, latitude: 45.1, empty: null, sport: 'Tennis' }])
    expect(isStylableField(profiles.OBJECTID)).toBe(false)
    expect(isStylableField(profiles.latitude)).toBe(false)
    expect(isStylableField(profiles.empty)).toBe(false)
    expect(isStylableField(profiles.sport)).toBe(true)
  })
})

describe('colour property', () => {
  it('finds a colour-named field whose values are colours', () => {
    expect(profileFields(features([{ colour: '#ff0000', color_name: 'red' }, { colour: '0,255,0' }])).colourProperty).toBe('colour')
  })

  it('ignores colour-named fields holding something else', () => {
    expect(profileFields(features([{ colour: 'Brick' }, { colour: 'Stone' }])).colourProperty).toBeUndefined()
  })
})

describe('propertyNormaliser', () => {
  const rows = [{ cost: '$5', open: 'Y', colour: '1,2,3', note: 'x' }, { cost: '7', open: 'N', colour: '#000', note: 'y' }]

  it('converts values to their profiled type and colour strings to CSS', () => {
    const normalise = propertyNormaliser(profileFields(features(rows)).fields, 'colour')
    expect(normalise(rows[0])).toEqual({ cost: 5, open: true, colour: 'rgb(1, 2, 3)', note: 'x' })
  })

  it('merges extras over the normalised values', () => {
    const normalise = propertyNormaliser(profileFields(features(rows)).fields)
    expect(normalise(rows[1], { datasetName: 'Parks' })).toMatchObject({ cost: 7, open: false, datasetName: 'Parks' })
  })
})
