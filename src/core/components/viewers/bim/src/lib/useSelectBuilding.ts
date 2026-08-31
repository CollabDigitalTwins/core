'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { BuildingsContext } from '../../../../../store'

import { withBuildingLocation } from './buildingLocationParams'

import type { Building } from '../../../../../types/dbTypes'

/**
 * The one way to switch the viewer to a building: publish it to the store and rewrite the URL's
 * location params to describe it. Every entry point routes through here so they cannot drift.
 */
export function useSelectBuilding() {
    const { dispatch } = React.useContext(BuildingsContext)
    const searchParams = useSearchParams()
    const router = useRouter()

    return React.useCallback((building: Building) => {
        dispatch({ type: 'SET-CURRENT-BUILDING', payload: { building } })
        const params = withBuildingLocation(new URLSearchParams(searchParams?.toString() ?? ''), building)
        router.replace(`?${params.toString()}`, { scroll: false })
    }, [dispatch, searchParams, router])
}
