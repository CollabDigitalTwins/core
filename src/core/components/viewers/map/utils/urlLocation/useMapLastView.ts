'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { rememberView } from '../../../shared/lastView/lastViewStore'
import { useLastViewScope } from '../../../shared/lastView/useLastViewScope'

import { cameraSnapshot, labelsFromParams, withLocationParams } from './locationParams'

import type { Map as MapLibreMap, MapLibreEvent } from 'maplibre-gl'

/** Remembers where the camera settles once the user has moved it, so the load-time fly never replaces their last view. */
export function useMapLastView(map: MapLibreMap | undefined) {
  const scope = useLastViewScope()

  React.useEffect(() => {
    if (!map || !scope) return
    let userMoved = false

    const onMoveStart = (event: MapLibreEvent<unknown>) => {
      if (event.originalEvent) userMoved = true
    }
    const onMoveEnd = () => {
      if (!userMoved) return
      const current = new URLSearchParams(window.location.search)
      rememberView(scope, 'map', withLocationParams(current, cameraSnapshot(map), labelsFromParams(current)))
    }

    map.on('movestart', onMoveStart)
    map.on('moveend', onMoveEnd)
    return () => {
      map.off('movestart', onMoveStart)
      map.off('moveend', onMoveEnd)
    }
  }, [map, scope])
}
