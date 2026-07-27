// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { LayerProps } from 'react-map-gl/maplibre'

/** JSON form of a MapLibre paint value: a literal colour or an expression. */
export type PaintValue = string | (string | number | boolean | null | PaintValue)[]

/** Cluster bubbles keyed on how many points they hide. The default when nothing else applies. */
export const CLUSTER_COUNT_COLOUR: PaintValue
  = ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1']

 export const createClusterLayer = (
  sourceId: string,
  circleColour: PaintValue = CLUSTER_COUNT_COLOUR,
): LayerProps => ({
  id: `${sourceId}-clusters`,
  type: 'circle',
  source: sourceId,
  filter: ['has', 'point_count'],
  paint: {
    // Cast at the one point where a structurally-typed expression meets the style spec's
    // generated union, rather than at every call site.
    'circle-color': circleColour as string,
    'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
  },
})

export const createClusterCountLayer = (sourceId: string): LayerProps => ({
  id: `${sourceId}-cluster-count`,
  type: 'symbol',
  source: sourceId,
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12,
  },
  paint: {
    'text-color': '#000',
    'text-halo-color': '#fff',
    'text-halo-width': 1,
  },
})

export const createUnclusteredPointLayer = (sourceId: string): LayerProps => ({
  id: `${sourceId}-unclustered-points`,
  type: 'circle',
  source: sourceId,
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#11b4da',
    'circle-radius': 20,
    'circle-stroke-width': 1,
    'circle-stroke-color': '#fff',
    'circle-opacity': 0,         // fully transparent to hide circle but allow clickable
    'circle-stroke-opacity': 0,  // makes stroke invisible too
  },
})
