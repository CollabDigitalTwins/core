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
    'zoom',
] as const

const BUILDING_ZOOM = '18'

/** A shared BIM camera is in one building's coordinates, so it must not survive a switch to another. */
const BIM_CAMERA_PARAMS = ['camX', 'camY', 'camZ', 'tarX', 'tarY', 'tarZ'] as const

export function withBuildingId(params: URLSearchParams, buildingId: number | string) {
    const next = new URLSearchParams(params.toString())
    const id = String(buildingId)
    if (next.get('buildingId') !== id) BIM_CAMERA_PARAMS.forEach(key => next.delete(key))
    next.set('buildingId', id)
    return next
}

function locationOf(building: Building) {
    const { buildingLatitude: lat, buildingLongitude: lng } = building
    const located = typeof lat === 'number' && typeof lng === 'number'
    return {
        municipality: building.buildingMunicipality,
        countrySubdivision: building.buildingCountrySubdivision,
        // Deliberately never written: it made the URL unreadable and buildingId already names it.
        address: undefined,
        lat: located ? String(lat) : undefined,
        lng: located ? String(lng) : undefined,
        zoom: located ? BUILDING_ZOOM : undefined,
    }
}

export function withBuildingLocation(params: URLSearchParams, building: Building) {
    const next = withBuildingId(params, building.id)

    const location = locationOf(building)
    for (const key of BUILDING_LOCATION_PARAMS) {
        const value = location[key]
        if (value) next.set(key, value)
        else next.delete(key)
    }
    return next
}
