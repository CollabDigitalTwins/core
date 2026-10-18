// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { readableTextColour } from '../../../../utils/colourUtils'

import type { DatasetLabel, DatasetRenderer, DatasetStyle } from '../../../../types/datasetTypes'
import type { ExpressionSpecification } from 'maplibre-gl'

type ColourValue = string | ExpressionSpecification

/** The geometry families MapLibre draws with different layer types, so a mixed collection needs one layer per family. */
export type GeometryFamily = 'polygons' | 'lines' | 'points'

export const LABEL_FONT = ['DIN Offc Pro Medium', 'Arial Unicode MS Bold']

const get = (field: string): ExpressionSpecification => ['get', field]

function stepExpression(field: string, breaks: number[], colours: string[]): ColourValue {
  if (breaks.length === 0) return colours[0]
  const stops = breaks.flatMap((threshold, i) => [threshold, colours[i + 1]])
  return ['step', ['to-number', get(field), breaks[0] - 1], colours[0], ...stops] as ExpressionSpecification
}

function matchExpression(field: string, renderer: Extract<DatasetRenderer, { kind: 'categorical' }>): ColourValue {
  if (renderer.categories.length === 0) return renderer.otherColour
  const arms = renderer.categories.flatMap(({ value, colour }) => [value, colour])
  return ['match', ['to-string', get(field)], ...arms, renderer.otherColour] as ExpressionSpecification
}

function opacityExpression(style: DatasetStyle): number | ExpressionSpecification {
  const { renderer } = style
  if (renderer.kind !== 'categorical' || renderer.categories.every(category => category.opacity === undefined)) return style.opacity
  const arms = renderer.categories.flatMap(({ value, opacity }) => [value, opacity ?? 1])
  const perCategory = ['match', ['to-string', get(renderer.field)], ...arms, 1] as ExpressionSpecification
  return ['*', style.opacity, perCategory]
}

/** The colour of each feature under `renderer`, as a constant or a MapLibre expression. */
export function colourExpression(renderer: DatasetRenderer, baseColour: string): ColourValue {
  switch (renderer.kind) {
    case 'featureColour':
      return ['to-color', get(renderer.property), baseColour]
    case 'categorical':
      return matchExpression(renderer.field, renderer)
    case 'boolean':
      return ['case', ['==', get(renderer.field), true], renderer.trueColour, ['==', get(renderer.field), false], renderer.falseColour, renderer.nullColour]
    case 'ramp':
      return ['interpolate', ['linear'], ['to-number', get(renderer.field), renderer.min], renderer.min, renderer.minColour, renderer.max, renderer.maxColour]
    case 'graduated':
      return stepExpression(renderer.field, renderer.breaks, renderer.colours)
    default:
      return baseColour
  }
}

export function circlePaint(style: DatasetStyle, baseColour: string) {
  return {
    'circle-radius': style.pointRadius,
    'circle-color': colourExpression(style.renderer, baseColour),
    'circle-opacity': opacityExpression(style),
    'circle-stroke-width': style.strokeWidth,
    'circle-stroke-color': style.strokeColour,
    'circle-stroke-opacity': style.strokeOpacity,
  }
}

export function linePaint(style: DatasetStyle, baseColour: string) {
  return { 'line-color': colourExpression(style.renderer, baseColour), 'line-width': style.lineWidth, 'line-opacity': style.opacity }
}

export function fillPaint(style: DatasetStyle, baseColour: string) {
  return { 'fill-color': colourExpression(style.renderer, baseColour), 'fill-opacity': opacityExpression(style) }
}

export function outlinePaint(style: DatasetStyle) {
  return { 'line-color': style.strokeColour, 'line-width': style.strokeWidth, 'line-opacity': style.strokeOpacity }
}

export function heatmapPaint(style: DatasetStyle) {
  const { renderer } = style
  const weight: ExpressionSpecification | number = renderer.kind === 'heatmap' && renderer.weightField && renderer.maxWeight
    ? ['interpolate', ['linear'], ['to-number', get(renderer.weightField), 0], 0, 0, renderer.maxWeight, 1]
    : 1
  return {
    'heatmap-weight': weight,
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, style.pointRadius / 2, 15, style.pointRadius * 4] as ExpressionSpecification,
    'heatmap-opacity': style.opacity,
  }
}

export function labelLayout(label: DatasetLabel, family: GeometryFamily) {
  return {
    'text-field': ['to-string', get(label.field)] as ExpressionSpecification,
    'text-font': LABEL_FONT,
    'text-size': label.size,
    'symbol-placement': family === 'lines' ? 'line' as const : 'point' as const,
    ...(family === 'points' && { 'text-offset': [0, 1.2] as [number, number], 'text-anchor': 'top' as const }),
  }
}

export function labelPaint(label: DatasetLabel) {
  return { 'text-color': label.colour, 'text-halo-color': readableTextColour(label.colour), 'text-halo-width': 1.2 }
}

export function clusterCirclePaint(baseColour: string) {
  return { 'circle-color': baseColour, 'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40] as ExpressionSpecification, 'circle-opacity': 0.9 }
}

export function clusterCountPaint(baseColour: string) {
  return { 'text-color': readableTextColour(baseColour) }
}
