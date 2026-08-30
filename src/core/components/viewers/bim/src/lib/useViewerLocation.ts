'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSearchParams } from 'next/navigation'
import * as React from 'react'

import { BuildingsContext } from '../../../../../store'

export interface ViewerLocation {
    latitude: number
    longitude: number
    /** Human-readable source of the coordinates, for showing which place a sun study is using. */
    label: string
    /**
     * Degrees the map places the site at, from `building.rotation`. This is the only link between
     * the model and geographic north; `bimRotation` is project north and never contributes.
     */
    northOffset: number
}

/** Ottawa, so a sun study still has somewhere to stand when nothing has been selected yet. */
export const FALLBACK_LOCATION: ViewerLocation = {
    latitude: 45.4215,
    longitude: -75.6972,
    label: 'Ottawa, ON',
    northOffset: 0,
}

function describe(name: string | undefined, latitude: number, longitude: number) {
    return name ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
}

/**
 * Where the viewer currently stands on the globe: the selected building first, then the URL
 * params the map writes, then a fallback. Sun studies read this.
 */
export function useViewerLocation(): ViewerLocation {
    const { state } = React.useContext(BuildingsContext)
    const building = state.buildings.building
    const searchParams = useSearchParams()

    return React.useMemo(() => {
        const { buildingLatitude, buildingLongitude } = building ?? {}
        // `rotation` is the map placement angle, the same one `extractPositionAndRotation` reads.
        const northOffset = building?.rotation ?? 0
        if (typeof buildingLatitude === 'number' && typeof buildingLongitude === 'number') {
            return {
                latitude: buildingLatitude,
                longitude: buildingLongitude,
                label: describe(building?.buildingName ?? building?.buildingAddress, buildingLatitude, buildingLongitude),
                northOffset,
            }
        }

        const lat = Number(searchParams?.get('lat'))
        const lng = Number(searchParams?.get('lng'))
        if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
            const municipality = searchParams?.get('municipality') ?? undefined
            return { latitude: lat, longitude: lng, label: describe(municipality, lat, lng), northOffset }
        }

        return FALLBACK_LOCATION
    }, [building, searchParams])
}
