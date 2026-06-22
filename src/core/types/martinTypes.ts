// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export interface ILayer {
  'name': string
  'organization': number
  'url'?: string
  'description'?: string
  'publisher'?: string
  'tileName'?: string
  'sourceLayer': string
  'municipality'?: string
  'countrySubdivision'?: string
  'layer': any
  'legend'?: boolean
  'clickable'?: boolean
  'hoverable'?: boolean
  'maxZoom'?: number
  'minZoom'?: number
  'textLayerName'?: string
  'fill-color'?: string
  'circle-color'?: string
  'line-color'?: string
  'line-width'?: number
  'line-opacity'?: number
  'fill-opacity'?: number
  'fill-extrusion-color'?: string
  'fill-extrusion-height'?: number | any[]
  'visible': boolean
  'properties'?: Record<string, string>
}

export const highlightColor = '#ffff55'

export const circleLayer: any = {
  type: 'circle',
  paint: {
    'circle-radius': 5,
    'circle-color': '#FF0000',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1,
  },
}

export const polygonLayer: any = {
  type: 'fill',
  paint: {
    'fill-color': '#ffff00',
    'fill-opacity': 0.7,
  },
}

export const extrusionLayer: any = {
  type: 'fill-extrusion',
  paint: {
    'fill-extrusion-height': 10,
    'fill-extrusion-base': 0,
    'fill-extrusion-opacity': 0.8,
  },
}

export const lineLayer: any = {
  type: 'line',
  paint: {
    'line-color': '#0000ff',
    'line-width': 2,
  },
}

export const textLayer: any = {
  type: 'symbol',
  layout: {
    'text-field': '{name}',
    'text-font': ['Open Sans Regular'],
    'text-size': 12,
  },
  paint: {
    'text-color': '#000000',
  },
}
