// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect } from 'vitest'

import { isBuildingGeometry, ringToBuildingGeometry, buildingGeometryToRing } from './buildingGeometry'

import type { Ring } from '../SiteLayer/siteGeometry'

const square: Ring = [[0, 0], [1, 0], [1, 1], [0, 1]]
const closedSquare = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]

describe('isBuildingGeometry', () => {
  it('accepts a closed Polygon ring', () => {
    expect(isBuildingGeometry({ type: 'Polygon', coordinates: [closedSquare] })).toBe(true)
  })

  it('accepts a polygon with holes', () => {
    expect(isBuildingGeometry({ type: 'Polygon', coordinates: [closedSquare, closedSquare] })).toBe(true)
  })

  it.each([
    ['null', null],
    ['a string', 'Polygon'],
    ['a Point', { type: 'Point', coordinates: [0, 0] }],
    ['a LineString', { type: 'LineString', coordinates: closedSquare }],
    ['a Feature wrapper', { type: 'Feature', geometry: { type: 'Polygon', coordinates: [closedSquare] } }],
    ['no coordinates', { type: 'Polygon' }],
    ['no rings', { type: 'Polygon', coordinates: [] }],
    ['an open ring', { type: 'Polygon', coordinates: [square] }],
    ['a ring under four positions', { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] }],
    ['a non-numeric position', { type: 'Polygon', coordinates: [[['a', 0], [1, 0], [1, 1], ['a', 0]]] }],
    ['a one-element position', { type: 'Polygon', coordinates: [[[0], [1, 0], [1, 1], [0]]] }],
  ])('rejects %s', (_label, value) => {
    expect(isBuildingGeometry(value)).toBe(false)
  })

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
  ])('rejects %s in a position', (_label, bad) => {
    expect(isBuildingGeometry({ type: 'Polygon', coordinates: [[[bad, 0], [1, 0], [1, 1], [bad, 0]]] })).toBe(false)
  })

  it.each([
    ['longitude', [181, 0]],
    ['latitude', [0, 91]],
  ])('rejects an out-of-range %s', (_label, bad) => {
    expect(isBuildingGeometry({ type: 'Polygon', coordinates: [[bad, [1, 0], [1, 1], bad]] })).toBe(false)
  })

  it('rejects a ring past the position cap', () => {
    const huge = Array.from({ length: 2001 }, () => [0, 0])
    expect(isBuildingGeometry({ type: 'Polygon', coordinates: [huge] })).toBe(false)
  })

  it('rejects more rings than the cap', () => {
    expect(isBuildingGeometry({ type: 'Polygon', coordinates: Array.from({ length: 11 }, () => closedSquare) })).toBe(false)
  })
})

describe('ringToBuildingGeometry', () => {
  it('closes an open ring', () => {
    expect(ringToBuildingGeometry(square).coordinates[0]).toEqual(closedSquare)
  })

  it('leaves an already-closed ring alone', () => {
    expect(ringToBuildingGeometry(closedSquare as Ring).coordinates[0]).toEqual(closedSquare)
  })

  it('produces a value its own validator accepts', () => {
    expect(isBuildingGeometry(ringToBuildingGeometry(square))).toBe(true)
  })
})

describe('buildingGeometryToRing', () => {
  it('round-trips a drawn ring', () => {
    expect(buildingGeometryToRing(ringToBuildingGeometry(square))).toEqual(square)
  })

  it('returns null for a non-polygon', () => {
    expect(buildingGeometryToRing({ type: 'Point', coordinates: [0, 0] })).toBeNull()
  })
})
