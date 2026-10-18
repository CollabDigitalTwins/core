// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { sampleRamp } from './colourRamps'
import { categoricalRenderer, datasetStyleOf, defaultStyle, DEFAULT_RASTER_OPACITY, graduatedRenderer, rendererLegend } from './datasetStyle'
import { distinctColours, MAP_COLOUR_PALETTE } from './stringToColour'
import { clusterCountPaint, colourExpression, fillPaint, heatmapPaint, labelPaint } from './styleExpressions'

import type { FieldProfile } from '../../../../types/datasetTypes'

const profile = (overrides: Partial<FieldProfile>): FieldProfile =>
  ({ name: 'f', type: 'string', isId: false, nullCount: 0, distinctValues: [], ...overrides })

const labels = { yes: 'Yes', no: 'No', other: 'Other', noData: 'No data' }

describe('colourExpression', () => {
  it('matches categories with a fallback for other values', () => {
    const renderer = { kind: 'categorical' as const, field: 'sport', categories: [{ value: 'Tennis', colour: '#111111' }], otherColour: '#999999' }
    expect(colourExpression(renderer, '#000')).toEqual(['match', ['to-string', ['get', 'sport']], 'Tennis', '#111111', '#999999'])
  })

  it('fades each category by its own opacity on top of the layer opacity', () => {
    const renderer = { kind: 'categorical' as const, field: 'ECUMENE', categories: [{ value: '1', colour: '#000000', opacity: 0 }, { value: '0', colour: '#e1e1e1' }], otherColour: '#999999' }
    expect(fillPaint({ ...defaultStyle(renderer), opacity: 0.8 }, '#000')['fill-opacity']).toEqual(['*', 0.8, ['match', ['to-string', ['get', 'ECUMENE']], '1', 0, '0', 1, 1]])
  })

  it('keeps a constant opacity when no category sets its own', () => {
    const renderer = { kind: 'categorical' as const, field: 'sport', categories: [{ value: 'Tennis', colour: '#111111' }], otherColour: '#999999' }
    expect(fillPaint({ ...defaultStyle(renderer), opacity: 0.8 }, '#000')['fill-opacity']).toBe(0.8)
  })

  it('steps through graduated breaks', () => {
    const renderer = { kind: 'graduated' as const, field: 'n', method: 'quantile' as const, breaks: [10, 20], colours: ['#a', '#b', '#c'] }
    expect(colourExpression(renderer, '#000')).toEqual(['step', ['to-number', ['get', 'n'], 9], '#a', 10, '#b', 20, '#c'])
  })

  it('falls back to the base colour when a feature colour does not parse', () => {
    expect(colourExpression({ kind: 'featureColour', property: 'colour' }, '#123456')).toEqual(['to-color', ['get', 'colour'], '#123456'])
  })

  it('uses the base colour for single and heatmap renderers', () => {
    expect(colourExpression({ kind: 'single' }, '#123456')).toBe('#123456')
    expect(colourExpression({ kind: 'heatmap' }, '#123456')).toBe('#123456')
  })
})

describe('renderer builders', () => {
  it('gives every category a distinct colour', () => {
    const renderer = categoricalRenderer(profile({ distinctValues: ['Tennis', 'Basketball', 'Soccer'] }))
    const colours = renderer.kind === 'categorical' ? renderer.categories.map(c => c.colour) : []
    expect(new Set(colours).size).toBe(3)
  })

  it('builds one more graduated colour than breaks', () => {
    const renderer = graduatedRenderer(profile({ type: 'number', numericSample: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }), 'equalInterval', 4)
    if (renderer.kind !== 'graduated') throw new Error('expected a graduated renderer')
    expect(renderer.breaks).toHaveLength(3)
    expect(renderer.colours).toHaveLength(4)
  })

  it('weights the heatmap by the field when one is given', () => {
    const style = defaultStyle({ kind: 'heatmap', weightField: 'n', maxWeight: 50 })
    expect(heatmapPaint(style)['heatmap-weight']).toEqual(['interpolate', ['linear'], ['to-number', ['get', 'n'], 0], 0, 0, 50, 1])
  })
})

describe('rendererLegend', () => {
  it('labels graduated classes as open-ended ranges', () => {
    const legend = rendererLegend({ kind: 'graduated', field: 'n', method: 'quantile', breaks: [10, 20], colours: ['#a', '#b', '#c'] }, labels)
    expect(legend.map(entry => entry.label)).toEqual(['< 10', '10 – 20', '≥ 20'])
  })

  it('adds the other row for categories and nothing for a single colour', () => {
    const legend = rendererLegend({ kind: 'categorical', field: 's', categories: [{ value: 'A', colour: '#1' }], otherColour: '#2' }, labels)
    expect(legend.at(-1)).toEqual({ label: 'Other', colour: '#2' })
    expect(rendererLegend({ kind: 'single' }, labels)).toEqual([])
  })
})

describe('palette helpers', () => {
  it('uses every palette colour once before repeating', () => {
    const values = Array.from({ length: MAP_COLOUR_PALETTE.length }, (_, i) => `value-${i}`)
    expect(new Set(distinctColours(values)).size).toBe(MAP_COLOUR_PALETTE.length)
  })

  it('samples a ramp from its first to its last stop', () => {
    expect(sampleRamp(['#000000', '#ffffff'], 3)).toEqual(['#000000', '#808080', '#ffffff'])
  })
})

describe('contrast and defaults', () => {
  it('starts points fully opaque and shapes translucent', () => {
    expect(defaultStyle(undefined, 'circle').opacity).toBe(1)
    expect(defaultStyle(undefined, 'fill').opacity).toBeLessThan(1)
  })

  it('writes cluster counts in black on light colours and white on dark ones', () => {
    expect(clusterCountPaint('#fde68a')['text-color']).toBe('#000000')
    expect(clusterCountPaint('#1e3a8a')['text-color']).toBe('#ffffff')
  })

  it('haloes a light label in black so it reads on any basemap', () => {
    expect(labelPaint({ field: 'name', size: 12, colour: '#ffffff' })['text-halo-color']).toBe('#000000')
    expect(labelPaint({ field: 'name', size: 12, colour: '#111827' })['text-halo-color']).toBe('#ffffff')
  })

  it('gives an unstyled dataset the default for what it draws', () => {
    expect(datasetStyleOf({ layerType: 'circle', datasetType: 'GeoJSON', type: 'dataset' }).opacity).toBe(1)
    expect(datasetStyleOf({ datasetType: 'WMS', type: 'WMS' }).opacity).toBe(DEFAULT_RASTER_OPACITY)
  })
})
