// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { withBuildingLocation } from './buildingLocationParams'

import type { Building } from '../../../../../types/dbTypes'

function building(overrides: Partial<Building> = {}) {
    return {
        id: 7,
        buildingType: [],
        buildingMunicipality: 'Ottawa',
        buildingCountrySubdivision: 'ON',
        buildingAddress: '1125 Colonel By Dr',
        buildingLatitude: 45.3839,
        buildingLongitude: -75.6966,
        ...overrides,
    } as Building
}

describe('withBuildingLocation', () => {
    it('describes the building rather than the map camera', () => {
        const params = new URLSearchParams({ municipality: 'Toronto', countrySubdivision: 'QC', lat: '0', lng: '0' })

        const next = withBuildingLocation(params, building())

        expect(next.get('buildingId')).toBe('7')
        expect(next.get('municipality')).toBe('Ottawa')
        expect(next.get('countrySubdivision')).toBe('ON')
        expect(next.get('lat')).toBe('45.3839')
        expect(next.get('lng')).toBe('-75.6966')
    })

    it('deletes a param the building has no value for, so the org fallback still applies', () => {
        const params = new URLSearchParams({ municipality: 'Toronto', countrySubdivision: 'QC' })

        const next = withBuildingLocation(params, building({
            buildingMunicipality: undefined,
            buildingCountrySubdivision: '',
        }))

        expect(next.has('municipality')).toBe(false)
        expect(next.has('countrySubdivision')).toBe(false)
    })

    it('keeps the address out of the URL, since buildingId already names the building', () => {
        const next = withBuildingLocation(new URLSearchParams({ address: 'stale' }), building())

        expect(next.has('address')).toBe(false)
    })

    it('leaves unrelated params alone', () => {
        const params = new URLSearchParams({ viewer: 'bim', zoom: '18' })

        const next = withBuildingLocation(params, building())

        expect(next.get('viewer')).toBe('bim')
        expect(next.get('zoom')).toBe('18')
    })

    it('does not mutate the params it was given', () => {
        const params = new URLSearchParams({ municipality: 'Toronto' })

        withBuildingLocation(params, building())

        expect(params.get('municipality')).toBe('Toronto')
        expect(params.has('buildingId')).toBe(false)
    })
})
