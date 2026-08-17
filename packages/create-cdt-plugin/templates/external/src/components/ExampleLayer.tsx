'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { stringToColour } from '@collabdt/core/plugins-sdk'
import * as React from 'react'

import type { MapToolProps } from '{{SURFACE_ENTRY}}'

const SOURCE = '{{SLUG}}-source'
const LAYER = '{{SLUG}}-layer'

/**
 * Draws a circle at the map's centre. Renders nothing: a plugin cannot import `maplibre-gl`,
 * so everything goes through the map handle. Cleaning up matters — see below.
 */
export function {{COMPONENT}}({ map }: MapToolProps) {
  React.useEffect(() => {
    if (!map) return

    const centre = map.getCenter()

    map.addSource(SOURCE, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [centre.lng, centre.lat] },
        properties: {},
      },
    })

    map.addLayer({
      id: LAYER,
      type: 'circle',
      source: SOURCE,
      paint: {
        'circle-radius': 8,
        'circle-color': stringToColour('{{SLUG}}'),
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })

    return () => {
      // Guarded: the style may be gone, and removing what is already gone throws.
      if (map.getLayer(LAYER)) map.removeLayer(LAYER)
      if (map.getSource(SOURCE)) map.removeSource(SOURCE)
    }
  }, [map])

  return null
}
