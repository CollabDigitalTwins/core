'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { createPortal } from 'react-dom'

import { usePluginTranslations } from '../../sdk/messages'
import { useMarkers } from '../markers'

import type { MapToolProps } from '../../sdk/mapViewer'
import type { Marker } from '../markers'

const SOURCE = 'hello-map-markers'
const LAYER = 'hello-map-markers'

/**
 * The markers on the map, and the popup for whichever one is open.
 *
 * A `map.layers` contribution rather than part of the toolbar tool: the tool's panel is a
 * dropdown that unmounts when it closes, so a layer owned there would vanish with it — and
 * a marker created from the sidebar tab would draw nothing at all.
 *
 * Everything goes through the map handle. A plugin cannot import `maplibre-gl`, because a
 * second copy of it breaks the viewer, so there is no `new maplibregl.Marker()` here: a
 * GeoJSON source and a circle layer do the same job and pan and zoom on the GPU for free.
 */
export function MarkersLayer({ map }: MapToolProps) {
  const { markers, open } = useMarkers()

  const featuresRef = React.useRef<Marker[]>(markers)
  featuresRef.current = markers

  React.useEffect(() => {
    if (!map) return

    // Re-run on every style change, not just once. The basemap switcher replaces the whole
    // style, which silently drops every source and layer added before it.
    const ensureLayer = () => {
      if (!map.getStyle() || map.getSource(SOURCE)) return

      map.addSource(SOURCE, { type: 'geojson', data: toFeatureCollection(featuresRef.current) })

      map.addLayer({
        id: LAYER,
        type: 'circle',
        source: SOURCE,
        paint: {
          // Read per feature, so recolouring one marker needs no layer change.
          'circle-color': ['get', 'colour'],
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
    }

    const openFeature = (event: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
      const key = event.features?.[0]?.properties?.key
      if (typeof key === 'string') open(key)
    }

    const pointer = () => { map.getCanvas().style.cursor = 'pointer' }
    const clearPointer = () => { map.getCanvas().style.cursor = '' }

    if (map.isStyleLoaded()) ensureLayer()
    map.on('styledata', ensureLayer)
    map.on('click', LAYER, openFeature)
    map.on('mouseenter', LAYER, pointer)
    map.on('mouseleave', LAYER, clearPointer)

    return () => {
      map.off('styledata', ensureLayer)
      map.off('click', LAYER, openFeature)
      map.off('mouseenter', LAYER, pointer)
      map.off('mouseleave', LAYER, clearPointer)

      // Both guarded: the style can be torn down before this runs, and removing something
      // already gone throws.
      if (map.getLayer(LAYER)) map.removeLayer(LAYER)
      if (map.getSource(SOURCE)) map.removeSource(SOURCE)
      clearPointer()
    }
  }, [map, open])

  // Data updates are a setData call, not a teardown: re-adding the layer on every change
  // would make the markers flicker.
  React.useEffect(() => {
    if (!map) return

    const source = map.getSource(SOURCE)
    if (source && 'setData' in source) {
      (source as { setData: (data: unknown) => void }).setData(toFeatureCollection(markers))
    }
  }, [map, markers])

  return <MarkerPopup map={map} />
}

function toFeatureCollection(markers: Marker[]) {
  return {
    type: 'FeatureCollection' as const,
    features: markers.map(marker => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [marker.longitude, marker.latitude] },
      // Only what the layer and the click handler read. Everything else stays in the store.
      properties: { key: marker.key, colour: marker.colour },
    })),
  }
}

/**
 * The popup for the open marker, portalled into the map's own container so it sits over the
 * canvas. Positioned with `map.project`, which is why it has to follow every move.
 */
function MarkerPopup({ map }: MapToolProps) {
  const t = usePluginTranslations()
  const { openMarker, open } = useMarkers()
  const [, forceReposition] = React.useState(0)

  React.useEffect(() => {
    if (!map || !openMarker) return

    const reposition = () => forceReposition(tick => tick + 1)

    map.on('move', reposition)
    return () => {
      map.off('move', reposition)
    }
  }, [map, openMarker])

  if (!map || !openMarker) return null

  const { x, y } = map.project([openMarker.longitude, openMarker.latitude])

  return createPortal(
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-full pb-3"
      style={{ left: x, top: y }}
    >
      <div className="rounded-md border bg-background px-3 py-2 shadow-lg">
        <div className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full border border-white"
            style={{ backgroundColor: openMarker.colour }}
          />
          <div className="text-xs">
            <p className="font-medium">{openMarker.name}</p>
            <p className="tabular-nums text-muted-foreground">
              {openMarker.latitude.toFixed(5)}, {openMarker.longitude.toFixed(5)}
            </p>
          </div>
          <button
            type="button"
            className="ml-2 text-muted-foreground hover:text-foreground"
            aria-label={t('close', 'Close')}
            onClick={() => open(null)}
          >
            ×
          </button>
        </div>
      </div>
    </div>,
    map.getContainer(),
  )
}
