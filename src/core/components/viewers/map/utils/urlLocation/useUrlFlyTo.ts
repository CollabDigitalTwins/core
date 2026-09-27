'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSearchParams } from 'next/navigation'
import * as React from 'react'

import { useBuilding } from '../../../../../hooks/buildings/buildings'
import { useSite } from '../../../../../hooks/sites/sites'
import { MapContext } from '../../../../../store'
import { searchPlace } from '../geocoding'

import { flyAndSyncUrl, writeLocationParams } from './locationParams'
import { presentLevels } from './locationTarget'
import { resolveLocationTarget } from './resolveLocationTarget'

import type { CameraSnapshot, LocationLabels } from './locationParams'
import type { CurrentLocation } from '../../../../../types/map'
import type { Map as MapLibreMap } from 'maplibre-gl'

function locationFrom(previous: CurrentLocation, labels: LocationLabels, camera: CameraSnapshot): CurrentLocation {
  return {
    ...previous,
    countrySubdivision: labels.countrySubdivision ?? '',
    municipality: labels.municipality ?? '',
    address: labels.address ?? '',
    site: labels.site ?? previous.site,
    lat: camera.lat,
    lng: camera.lng,
    zoom: camera.zoom,
    bearing: camera.bearing,
    pitch: camera.pitch,
  }
}

/** On load, flies to the finest location the URL names, then writes the full location back into the URL. */
export function useUrlFlyTo(map: MapLibreMap | undefined, countryCode?: string) {
  const searchParams = useSearchParams()
  const [params] = React.useState(() => new URLSearchParams(searchParams.toString()))
  const levels = React.useMemo(() => presentLevels(params), [params])

  const { site, isLoading: siteLoading } = useSite(levels.includes('site') ? params.get('site') ?? '' : '')
  const { building, isLoading: buildingLoading } = useBuilding(levels.includes('buildingId') ? Number(params.get('buildingId')) : null)

  const { dispatch, state } = React.useContext(MapContext)
  const currentLocationRef = React.useRef(state.map.currentLocation)
  currentLocationRef.current = state.map.currentLocation

  const started = React.useRef(false)

  React.useEffect(() => {
    if (!map || started.current || siteLoading || buildingLoading) return
    started.current = true

    void (async () => {
      const resolved = await resolveLocationTarget(params, { searchPlace, site, building, countryCode })
      if (!resolved) return
      const camera = resolved.level === 'latlng'
        ? writeLocationParams(map, resolved.labels)
        : await flyAndSyncUrl(map, resolved.target, resolved.labels)
      const previous = currentLocationRef.current
      if (previous) dispatch({ type: 'UPDATE_LOCATION', payload: { currentLocation: locationFrom(previous, resolved.labels, camera) } })
    })()
  }, [map, siteLoading, buildingLoading, params, site, building, countryCode, dispatch])
}
