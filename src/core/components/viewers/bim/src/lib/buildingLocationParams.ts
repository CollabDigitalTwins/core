// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Building } from '../../../../../types/dbTypes'

/** The URL params a selected building owns. Anything absent on the record is cleared, not blanked. */
const BUILDING_LOCATION_PARAMS = [
    'municipality',
    'countrySubdivision',
    'address',
    'lat',
    'lng',
] as const

function locationOf(building: Building) {
    const { buildingLatitude: lat, buildingLongitude: lng } = building
    return {
        municipality: building.buildingMunicipality,
        countrySubdivision: building.buildingCountrySubdivision,
        // Deliberately never written: it made the URL unreadable and buildingId already names it.
        address: undefined,
        lat: typeof lat === 'number' ? String(lat) : undefined,
        lng: typeof lng === 'number' ? String(lng) : undefined,
    }
}

/**
 * Rewrites the location params to describe `building`, not wherever the map camera sat. The
 * address is left out: `buildingId` already names it, and it made the URL unreadable.
 */
export function withBuildingLocation(params: URLSearchParams, building: Building) {
    const next = new URLSearchParams(params.toString())
    next.set('buildingId', String(building.id))

    const location = locationOf(building)
    for (const key of BUILDING_LOCATION_PARAMS) {
        const value = location[key]
        if (value) next.set(key, value)
        else next.delete(key)
    }
    return next
}
