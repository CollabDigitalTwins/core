"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSearchParams, useRouter } from 'next/navigation'
import * as React from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'

import { MapContext } from '../../../../../../../store/Map/context'

import { maptilerKeyOrPlaceholder } from '../../../../utils/mapStyleSpec'

import { hexToRgba, buildSubdivisionUrl } from './countryLayerUtils'
import { useCameraSubdivision } from './useCameraSubdivision'
import { useSubdivisionHover } from './useSubdivisionHover'

import type { Organization } from '../../../../../../../types/dbTypes'

const DEFAULT_BORDER_COLOR = '#73cee2'
const BOUNDARIES_SOURCE_ID = 'openmaptiles-boundaries'
const SUBDIVISION_SOURCE_ID = 'admin-subdivisions-source'
const SUBDIVISION_FILL_ID = 'admin-subdivisions-fill'
const SUBDIVISION_LINE_ID = 'admin-subdivisions-line'
const SUBDIVISION_LINE_MAX_ZOOM = 15
const SUBDIVISION_HOVER_MIN_ZOOM = 10

const SUBDIVISION_LINE_WIDTH = [
  'case',
  ['all', ['boolean', ['feature-state', 'hover'], false], ['>', ['zoom'], SUBDIVISION_HOVER_MIN_ZOOM]],
  ['interpolate', ['linear'], ['zoom'], 10, 3, 15, 5],
  ['interpolate', ['linear'], ['zoom'], 4, 0.5, 8, 1.4, 14, 2.4],
] as const
const GLOBAL_LAYER_IDS = [
  'global-borders-country',
  'global-borders-region',
  'global-labels-country',
  'global-labels-state',
  'global-labels-city',
] as const

function addGlobalBorderLayer(map: any, color: string, maptilerKey?: string) {
  try {
    if (!map.getSource(BOUNDARIES_SOURCE_ID)) {
      map.addSource(BOUNDARIES_SOURCE_ID, {
        type: 'vector',
        url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${maptilerKeyOrPlaceholder(maptilerKey)}`,
      })
    }

    // Country borders — visible at all zooms, slightly thinner up close where states take over.
    if (!map.getLayer('global-borders-country')) {
      map.addLayer({
        id: 'global-borders-country',
        type: 'line',
        source: BOUNDARIES_SOURCE_ID,
        'source-layer': 'boundary',
        filter: ['all', ['==', 'admin_level', 2], ['==', 'maritime', 0]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': color,
          'line-width': { base: 1, stops: [[0, 0.8], [4, 1.4], [10, 1.4], [14, 1]] },
        },
      })
    }

    // State / province borders — fade in around zoom 3, dominate from 5+.
    if (!map.getLayer('global-borders-region')) {
      map.addLayer({
        id: 'global-borders-region',
        type: 'line',
        source: BOUNDARIES_SOURCE_ID,
        'source-layer': 'boundary',
        filter: ['all', ['in', 'admin_level', 3, 4], ['==', 'maritime', 0]],
        minzoom: 2,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': color,
          'line-width': { base: 1, stops: [[2, 0], [4, 0.5], [8, 1.4], [14, 2.4]] },
          'line-opacity': { base: 1, stops: [[2, 0], [4, 0.7], [6, 1]] },
        },
      })
    }

    // Country labels — small/global up to zoom ~6, gone by 8.
    if (!map.getLayer('global-labels-country')) {
      map.addLayer({
        id: 'global-labels-country',
        type: 'symbol',
        source: BOUNDARIES_SOURCE_ID,
        'source-layer': 'place',
        filter: ['==', 'class', 'country'],
        minzoom: 1,
        maxzoom: 8,
        layout: {
          'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': { base: 1, stops: [[1, 10], [4, 13], [6, 16]] },
          'text-letter-spacing': 0.1,
          'text-max-width': 8,
          'text-transform': 'uppercase',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1.2,
          'text-opacity': { base: 1, stops: [[5, 1], [7, 0]] },
        },
      })
    }

    // State / province labels — cover zoom 3–8.
    if (!map.getLayer('global-labels-state')) {
      map.addLayer({
        id: 'global-labels-state',
        type: 'symbol',
        source: BOUNDARIES_SOURCE_ID,
        'source-layer': 'place',
        filter: ['in', 'class', 'state', 'province'],
        minzoom: 3,
        maxzoom: 9,
        layout: {
          'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': { base: 1, stops: [[3, 9], [6, 12], [8, 14]] },
          'text-letter-spacing': 0.05,
          'text-max-width': 8,
        },
        paint: {
          'text-color': '#e8e8e8',
          'text-halo-color': 'rgba(0,0,0,0.6)',
          'text-halo-width': 1,
          'text-opacity': { base: 1, stops: [[3, 0], [4, 1], [8, 1], [9, 0]] },
        },
      })
    }

    // Major city labels (rank ≤ 4 = most prominent cities) — appear when zoomed in past country level.
    if (!map.getLayer('global-labels-city')) {
      map.addLayer({
        id: 'global-labels-city',
        type: 'symbol',
        source: BOUNDARIES_SOURCE_ID,
        'source-layer': 'place',
        filter: ['in', 'class', 'city', 'town'],
        minzoom: 5,
        maxzoom: 13,
        layout: {
          'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': { base: 1, stops: [[5, 10], [9, 13], [12, 15]] },
          'text-max-width': 8,
        },
        paint: {
          'text-color': '#dcdcdc',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1.1,
        },
      })
    }
  } catch {
    // style may be in a transitional state
  }
}

export const CountryLayer = ({ organization, maptilerKey }: { organization?: Organization; maptilerKey?: string }) => {
  const { state: mapState, dispatch: mapDispatch } = React.useContext(MapContext)
  const { map, currentLocation } = mapState.map
  const searchParams = useSearchParams()
  const router = useRouter()

  const countryCode = (organization?.country || 'CA').toUpperCase()
  const borderColor = hexToRgba((organization?.mainColor as string) || DEFAULT_BORDER_COLOR, 0.7)
  const subdivisionUrl = buildSubdivisionUrl(countryCode)

  // Re-added on every style swap: setStyle drops imperatively added layers.
  React.useEffect(() => {
    if (!map) return
    const addNow = () => addGlobalBorderLayer(map, borderColor, maptilerKey)
    if (map.isStyleLoaded()) addNow()
    map.on('styledata', addNow)
    return () => {
      try {
        map.off('styledata', addNow)
        for (const id of GLOBAL_LAYER_IDS) {
          if (map.getLayer(id)) map.removeLayer(id)
        }
      } catch {
        // map may be destroyed
      }
    }
  }, [map, borderColor, maptilerKey])

  // If the org already has a fixed subdivision or municipality, lock them in and skip camera tracking
  const orgHasLocation = !!(organization?.countrySubdivision || organization?.municipality)

  // A selected building owns the location params; camera tracking would overwrite them on the first pan.
  const buildingOwnsLocation = !!searchParams.get('buildingId')

  // When org has fixed location values, push them into currentLocation once
  React.useEffect(() => {
    if (!orgHasLocation) return
    mapDispatch({
      type: 'UPDATE_LOCATION',
      payload: {
        currentLocation: {
          ...(currentLocation ?? {}),
          countrySubdivision: organization?.countrySubdivision ?? currentLocation?.countrySubdivision,
          municipality: organization?.municipality ?? currentLocation?.municipality,
        } as any,
      },
    })

  }, [orgHasLocation])

  const commitSubdivision = React.useCallback((code: string) => {
    if (code === (currentLocation?.countrySubdivision || null)) return

    mapDispatch({
      type: 'UPDATE_LOCATION',
      payload: {
        currentLocation: { ...(currentLocation ?? {}), countrySubdivision: code } as any,
      },
    })

    const params = new URLSearchParams(searchParams.toString())
    params.set('countrySubdivision', code)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [currentLocation, mapDispatch, router, searchParams])

  useCameraSubdivision({
    map,
    layerId: SUBDIVISION_FILL_ID,
    sourceId: SUBDIVISION_SOURCE_ID,
    enabled: !orgHasLocation && !buildingOwnsLocation,
    onResolve: commitSubdivision,
  })

  useSubdivisionHover({
    map,
    layerId: SUBDIVISION_FILL_ID,
    sourceId: SUBDIVISION_SOURCE_ID,
    enabled: !orgHasLocation,
  })

  if (orgHasLocation) return null

  return (
    <Source
      id={SUBDIVISION_SOURCE_ID}
      type="geojson"
      data={subdivisionUrl}
      generateId
    >
      {/* Zero opacity, never visible: this is what hit-tests the camera target and the pointer. */}
      <Layer
        id={SUBDIVISION_FILL_ID}
        type="fill"
        paint={{ 'fill-color': borderColor, 'fill-opacity': 0 }}
      />
      <Layer
        id={SUBDIVISION_LINE_ID}
        type="line"
        maxzoom={SUBDIVISION_LINE_MAX_ZOOM}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': borderColor,
          'line-width': SUBDIVISION_LINE_WIDTH as never,
        }}
      />
    </Source>
  )
}
