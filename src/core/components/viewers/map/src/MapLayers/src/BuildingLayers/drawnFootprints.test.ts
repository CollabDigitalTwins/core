// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { drawnFootprints, footprintsInBounds, osmStoreyHeights, overriddenOsmIds } from './drawnFootprints'

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

    expect(features[0].properties?.height).toBe(3.5)
  })

  it('draws a footprint that replaces an OSM one', () => {
    expect(drawnFootprints([building({ buildingGeometry: square, buildingOsmId: '9' })]).features).toHaveLength(1)
  })

  it('skips missing or malformed geometry', () => {
    const malformed = { type: 'Polygon', coordinates: [[[0, 0], [1, 0]]] } as Building['buildingGeometry']

    expect(drawnFootprints([building({}), building({ buildingGeometry: malformed })]).features).toEqual([])
  })
})

describe('overriddenOsmIds', () => {
  it('lists the OSM ids of buildings that have their own footprint', () => {
    const buildings = [
      building({ id: 1, buildingOsmId: '9', buildingGeometry: square }),
      building({ id: 2, buildingOsmId: '10' }),
      building({ id: 3, buildingGeometry: square }),
    ]

    expect(overriddenOsmIds(buildings)).toEqual(['9'])
  })
})

describe('footprintsInBounds', () => {
  const footprints = drawnFootprints([building({ id: 7, buildingGeometry: square })])

  it('keeps footprints that overlap the view', () => {
    expect(footprintsInBounds(footprints, [0.5, 0.5, 2, 2]).features).toHaveLength(1)
  })

  it('drops footprints outside the view', () => {
    expect(footprintsInBounds(footprints, [5, 5, 6, 6]).features).toEqual([])
  })

  it('draws nothing before the view is known', () => {
    expect(footprintsInBounds(footprints, null).features).toEqual([])
  })
})

describe('osmStoreyHeights', () => {
  it('maps OSM ids to the height their storeys imply, sorted', () => {
    expect(osmStoreyHeights([
      building({ buildingOsmId: '9', buildingStoreyNum: 2 }),
      building({ buildingOsmId: '10', buildingStoreyNum: 4 }),
    ])).toEqual([['10', 14], ['9', 7]])
  })

  it('leaves the tile height alone without an OSM id or storeys', () => {
    expect(osmStoreyHeights([building({ buildingStoreyNum: 3 }), building({ buildingOsmId: '9' })])).toEqual([])
  })

  it('keeps the first building claiming an OSM id', () => {
    expect(osmStoreyHeights([
      building({ buildingOsmId: '9', buildingStoreyNum: 2 }),
      building({ buildingOsmId: '9', buildingStoreyNum: 5 }),
    ])).toEqual([['9', 7]])
  })
})
