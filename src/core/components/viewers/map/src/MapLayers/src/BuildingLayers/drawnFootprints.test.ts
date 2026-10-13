// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { drawnFootprints } from './drawnFootprints'

import type { Building } from '../../../../../../../types/dbTypes'

const square = { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] as [number, number][][] }

const building = (overrides: Partial<Building>): Building => ({ id: 1, ...overrides } as Building)

describe('drawnFootprints', () => {
  it('extrudes a drawn footprint by its storeys', () => {
    const { features } = drawnFootprints([building({ id: 7, buildingName: 'Annex', buildingGeometry: square, buildingStoreyNum: 4 })])

    expect(features).toEqual([{
      type: 'Feature',
      id: 7,
      geometry: square,
      properties: { dbId: 7, name: 'Annex', height: 14 },
    }])
  })

  it('gives a footprint without storeys a default height', () => {
    const { features } = drawnFootprints([building({ buildingGeometry: square })])

    expect(features[0].properties?.height).toBe(7)
  })

  it('skips buildings the OSM layer already draws', () => {
    expect(drawnFootprints([building({ buildingGeometry: square, buildingOsmId: '9' })]).features).toEqual([])
  })

  it('skips missing or malformed geometry', () => {
    const malformed = { type: 'Polygon', coordinates: [[[0, 0], [1, 0]]] } as Building['buildingGeometry']

    expect(drawnFootprints([building({}), building({ buildingGeometry: malformed })]).features).toEqual([])
  })
})
