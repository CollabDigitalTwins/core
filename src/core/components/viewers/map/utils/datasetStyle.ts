// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { isRasterDataset } from '../datasets/src/mapServices'

import { classBreaks } from './classBreaks'
import { COLOUR_RAMPS, DEFAULT_COLOUR_RAMP, sampleRamp, type ColourRampName } from './colourRamps'
import { distinctColours } from './stringToColour'

import type { ClassificationMethod, Dataset, DatasetRenderer, DatasetStyle, FieldProfile, LayerColors, LayerGeometryType } from '../../../../types/datasetTypes'

const MAX_CATEGORIES = 12
const NO_DATA_COLOUR = '#d1d5db'
export const OTHER_COLOUR = '#9ca3af'
export const DEFAULT_CLASS_COUNT = 5
export const FALLBACK_COLOUR = '#0d9488'
export const DEFAULT_RASTER_OPACITY = 0.85

export function defaultStyle(renderer: DatasetRenderer = { kind: 'single' }, layerType?: LayerGeometryType): DatasetStyle {
  const opacity = layerType === 'circle' ? 1 : 0.7
  return { renderer, opacity, strokeColour: '#ffffff', strokeWidth: 1.5, strokeOpacity: 1, pointRadius: 6, lineWidth: 3 }
}

/** The style a dataset draws with: its own, or the default for its geometry, with rasters at the raster opacity. */
export function datasetStyleOf(dataset: Pick<Dataset, 'style' | 'layerType' | 'datasetType' | 'mapService' | 'type'>): DatasetStyle {
  if (dataset.style) return dataset.style
  return isRasterDataset(dataset) ? { ...defaultStyle(), opacity: DEFAULT_RASTER_OPACITY } : defaultStyle(undefined, dataset.layerType)
}

export function baseColourOf(dataset: Pick<Dataset, 'layerColor'>): string {
  return dataset.layerColor?.color || FALLBACK_COLOUR
}

export function categoricalRenderer(profile: FieldProfile): DatasetRenderer {
  const values = profile.distinctValues.slice(0, MAX_CATEGORIES)
  const colours = distinctColours(values)
  return {
    kind: 'categorical',
    field: profile.name,
    categories: values.map((value, i) => ({ value, colour: colours[i] })),
    otherColour: OTHER_COLOUR,
  }
}

export function booleanRenderer(profile: FieldProfile, base: LayerColors): DatasetRenderer {
  return { kind: 'boolean', field: profile.name, trueColour: base.maxColor ?? base.color, falseColour: base.minColor ?? base.color, nullColour: NO_DATA_COLOUR }
}

export function rampRenderer(profile: FieldProfile, base: LayerColors): DatasetRenderer {
  const min = profile.min ?? 0
  const max = profile.max ?? min + 1
  return { kind: 'ramp', field: profile.name, min, max: max > min ? max : min + 1, minColour: base.minColor ?? base.color, maxColour: base.maxColor ?? base.color }
}

export function graduatedRenderer(
  profile: FieldProfile,
  method: ClassificationMethod = 'quantile',
  classes = DEFAULT_CLASS_COUNT,
  ramp: ColourRampName = DEFAULT_COLOUR_RAMP,
): DatasetRenderer {
  const breaks = classBreaks(profile.numericSample ?? [], classes, method)
  return { kind: 'graduated', field: profile.name, method, breaks, colours: sampleRamp(COLOUR_RAMPS[ramp], breaks.length + 1), ramp }
}

export function heatmapRenderer(profile?: FieldProfile): DatasetRenderer {
  return profile ? { kind: 'heatmap', weightField: profile.name, maxWeight: profile.max } : { kind: 'heatmap' }
}

/** Numbers, and dates stored as numbers, have a range to colour along; dates stored as text do not. */
export function hasNumericRange(profile: FieldProfile): boolean {
  return (profile.type === 'number' || profile.type === 'datetime') && profile.min !== undefined
}

/** The renderer a field gets when first picked: categories for text, a pair for booleans, a ramp for numbers. */
export function rendererForField(profile: FieldProfile, base: LayerColors): DatasetRenderer {
  if (profile.type === 'boolean') return booleanRenderer(profile, base)
  if (hasNumericRange(profile)) return rampRenderer(profile, base)
  return categoricalRenderer(profile)
}

export function rendererField(renderer: DatasetRenderer): string | undefined {
  if (renderer.kind === 'featureColour') return renderer.property
  if (renderer.kind === 'heatmap') return renderer.weightField
  return 'field' in renderer ? renderer.field : undefined
}

interface LegendEntry {
  label: string
  colour: string
}

const STANDARD_NUMBER = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, notation: 'standard' })
const COMPACT_NUMBER = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, notation: 'compact' })

const formatNumber = (value: number) => (Math.abs(value) >= 1e5 ? COMPACT_NUMBER : STANDARD_NUMBER).format(value)

function graduatedLegend(breaks: number[], colours: string[]): LegendEntry[] {
  if (breaks.length === 0) return [{ label: '', colour: colours[0] }]
  return colours.map((colour, i) => {
    if (i === 0) return { label: `< ${formatNumber(breaks[0])}`, colour }
    if (i === breaks.length) return { label: `≥ ${formatNumber(breaks[i - 1])}`, colour }
    return { label: `${formatNumber(breaks[i - 1])} – ${formatNumber(breaks[i])}`, colour }
  })
}

/** Legend rows for a renderer; empty when a single swatch says it all. `labels` supplies the localised words. */
export function rendererLegend(renderer: DatasetRenderer, labels: { yes: string; no: string; other: string; noData: string }): LegendEntry[] {
  switch (renderer.kind) {
    case 'categorical':
      return [...renderer.categories.map(({ value, colour }) => ({ label: value, colour })), { label: labels.other, colour: renderer.otherColour }]
    case 'boolean':
      return [{ label: labels.yes, colour: renderer.trueColour }, { label: labels.no, colour: renderer.falseColour }, { label: labels.noData, colour: renderer.nullColour }]
    case 'ramp':
      return [{ label: formatNumber(renderer.min), colour: renderer.minColour }, { label: formatNumber(renderer.max), colour: renderer.maxColour }]
    case 'graduated':
      return graduatedLegend(renderer.breaks, renderer.colours)
    default:
      return []
  }
}
