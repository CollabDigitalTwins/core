// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { BUILDINGS_LAYER_ID, resolveClickPlacement } from './resolveClickPlacement'

import type { Building } from '../../../../../types/dbTypes'

const BUILDINGS = [
  { id: 4, buildingOsmId: '12345' },
  { id: 9, buildingOsmId: '99999' },
] as Building[]

const AT = { point: { x: 10, y: 20 }, lngLat: { lng: -75.7, lat: 45.4 } }

function fakeMap(over: { terrain?: number | null, features?: unknown[], hasLayer?: boolean } = {}) {
  return {
    getLayer: vi.fn(() => (over.hasLayer === false ? undefined : {})),
    queryTerrainElevation: vi.fn(() => over.terrain ?? null),
    queryRenderedFeatures: vi.fn(() => over.features ?? []),
  } as never
}

describe('resolveClickPlacement', () => {
  it('reads the terrain under the click as the elevation', () => {
    const placement = resolveClickPlacement(fakeMap({ terrain: 74.5 }), AT, BUILDINGS)

    expect(placement).toMatchObject({ lng: -75.7, lat: 45.4, elevation: 74.5 })
  })

  it('places at sea level where the map has no terrain to ask', () => {
    expect(resolveClickPlacement(fakeMap({ terrain: null }), AT, BUILDINGS).elevation).toBe(0)
  })

  it('links the building whose footprint was clicked', () => {
    const map = fakeMap({ features: [{ properties: { osm_id: '12345' } }] })

    expect(resolveClickPlacement(map, AT, BUILDINGS).buildingId).toBe(4)
  })

  it('matches an id the tile serves as a number', () => {
    const map = fakeMap({ features: [{ id: 99999, properties: {} }] })

    expect(resolveClickPlacement(map, AT, BUILDINGS).buildingId).toBe(9)
  })

  it('links nothing when the click lands on open ground', () => {
    expect(resolveClickPlacement(fakeMap({ features: [] }), AT, BUILDINGS).buildingId).toBeNull()
  })

  it('links nothing when the footprint belongs to no building we hold', () => {
    const map = fakeMap({ features: [{ properties: { osm_id: '55555' } }] })

    expect(resolveClickPlacement(map, AT, BUILDINGS).buildingId).toBeNull()
  })

  it('asks only the buildings layer, and only when the map is drawing it', () => {
    const map = fakeMap({ hasLayer: false })

    expect(resolveClickPlacement(map, AT, BUILDINGS).buildingId).toBeNull()
    expect((map as unknown as { queryRenderedFeatures: ReturnType<typeof vi.fn> }).queryRenderedFeatures)
      .not.toHaveBeenCalled()
    expect(BUILDINGS_LAYER_ID).toBeTruthy()
  })
})
