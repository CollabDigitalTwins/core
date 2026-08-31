'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { BuildingsContext } from '../../../../store'

import { withBuildingLocation } from './lib/buildingLocationParams'

/**
 * Keeps the URL's location params describing the building on screen. Selection handlers only
 * cover the case where the user picks one here; most arrivals already carry a `buildingId`.
 */
export function BuildingLocationSync() {
  const { state } = React.useContext(BuildingsContext)
  const building = state.buildings.building
  const searchParams = useSearchParams()
  const router = useRouter()

  React.useEffect(() => {
    if (!building) return

    const current = new URLSearchParams(searchParams?.toString() ?? '')
    const next = withBuildingLocation(current, building)
    if (next.toString() === current.toString()) return

    router.replace(`?${next.toString()}`, { scroll: false })
  }, [building, searchParams, router])

  return null
}
