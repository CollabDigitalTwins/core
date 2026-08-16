'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { stringToColour } from '../../sdk'

import type { MapToolProps } from '{{CORE_ENTRY}}'

const SOURCE = '{{SLUG}}-source'
const LAYER = '{{SLUG}}-layer'

/**
 * Draws a circle at the map's centre. Renders nothing: everything it does goes through the
 * map handle, which is the only way a plugin can draw — `maplibre-gl` is not importable,
 * because a second copy of it would break the viewer.
 *
 * The cleanup is the part worth copying. This component unmounts whenever the plugin is
 * disabled, and a source left behind makes the next mount throw on a duplicate id.
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
      // Guard both: the style can be torn down before this runs, and removing a layer
      // that is already gone throws.
      if (map.getLayer(LAYER)) map.removeLayer(LAYER)
      if (map.getSource(SOURCE)) map.removeSource(SOURCE)
    }
  }, [map])

  return null
}
