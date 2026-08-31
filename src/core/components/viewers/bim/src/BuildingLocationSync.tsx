'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { BuildingsContext } from '../../../../store'

import { withBuildingLocation } from './lib/buildingLocationParams'

/**
 * Fills in the location params for a building that arrived by URL. Selection writes them itself,
 * so this only covers the case where a `buildingId` is present without the rest.
 */
export function BuildingLocationSync() {
  const { state } = React.useContext(BuildingsContext)
  const building = state.buildings.building
  const searchParams = useSearchParams()
  const router = useRouter()

  React.useEffect(() => {
    if (!building) return

    // Mid-switch these still name the previous building, and writing would queue a second nav.
    const current = new URLSearchParams(searchParams?.toString() ?? '')
    if (current.get('buildingId') !== String(building.id)) return

    const next = withBuildingLocation(current, building)
    if (next.toString() === current.toString()) return

    router.replace(`?${next.toString()}`, { scroll: false })
  }, [building, searchParams, router])

  return null
}
