// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { fromEsriColour } from '../../../../../utils/colourUtils'
import { defaultStyle, OTHER_COLOUR } from '../../utils/datasetStyle'

import type { DatasetRenderer, SourceStyle } from '../../../../../types/datasetTypes'

interface EsriSymbol {
  color?: unknown
  size?: number
  width?: number
  outline?: { color?: unknown; width?: number }
}

interface EsriRenderer {
  type?: string
  symbol?: EsriSymbol
  field1?: string
  defaultSymbol?: EsriSymbol
  uniqueValueInfos?: Array<{ value?: string | number; symbol?: EsriSymbol }>
  field?: string
  classBreakInfos?: Array<{ classMaxValue?: number; symbol?: EsriSymbol }>
}

export interface EsriDrawingInfo {
  renderer?: EsriRenderer
  transparency?: number
}

const POINTS_TO_PIXELS = 4 / 3

const symbolColour = (symbol?: EsriSymbol) => fromEsriColour(symbol?.color)

function uniqueValueRenderer(renderer: EsriRenderer): DatasetRenderer | undefined {
  const categories = (renderer.uniqueValueInfos ?? []).flatMap(({ value, symbol }) => {
    const colour = symbolColour(symbol)
    if (!colour || value === undefined) return []
    return [colour.opacity < 1 ? { value: String(value), colour: colour.colour, opacity: colour.opacity } : { value: String(value), colour: colour.colour }]
  })
  if (!renderer.field1 || categories.length === 0) return undefined
  return { kind: 'categorical', field: renderer.field1, categories, otherColour: symbolColour(renderer.defaultSymbol)?.colour ?? OTHER_COLOUR }
}

function classBreaksRenderer(renderer: EsriRenderer): DatasetRenderer | undefined {
  const infos = (renderer.classBreakInfos ?? []).filter(info => typeof info.classMaxValue === 'number' && symbolColour(info.symbol))
  if (!renderer.field || infos.length === 0) return undefined
  return {
    kind: 'graduated',
    field: renderer.field,
    method: 'equalInterval',
    breaks: infos.slice(0, -1).map(info => info.classMaxValue as number),
    colours: infos.map(info => symbolColour(info.symbol)!.colour),
  }
}

function representativeSymbol(renderer: EsriRenderer): EsriSymbol | undefined {
  return renderer.symbol ?? renderer.uniqueValueInfos?.[0]?.symbol ?? renderer.classBreakInfos?.[0]?.symbol ?? renderer.defaultSymbol
}

/** The publisher's ArcGIS symbology as a dataset style, plus the flat colour for a simple renderer. */
export function styleFromDrawingInfo(drawingInfo: EsriDrawingInfo | undefined): SourceStyle | undefined {
  const renderer = drawingInfo?.renderer
  if (!renderer) return undefined
  const datasetRenderer = renderer.type === 'uniqueValue'
    ? uniqueValueRenderer(renderer)
    : renderer.type === 'classBreaks' ? classBreaksRenderer(renderer) : undefined
  const symbol = representativeSymbol(renderer)
  const fill = symbolColour(symbol)
  if (!datasetRenderer && !fill) return undefined

  const style = defaultStyle(datasetRenderer)
  const outline = fromEsriColour(symbol?.outline?.color)
  const layerTransparency = (drawingInfo.transparency ?? 0) / 100
  if (datasetRenderer?.kind === 'categorical') style.opacity = 1 - layerTransparency
  else if (fill) style.opacity = fill.opacity * (1 - layerTransparency)
  if (outline) {
    style.strokeColour = outline.colour
    style.strokeOpacity = outline.opacity
  }
  if (symbol?.outline?.width !== undefined) style.strokeWidth = symbol.outline.width * POINTS_TO_PIXELS
  if (symbol?.width !== undefined) style.lineWidth = symbol.width * POINTS_TO_PIXELS
  if (symbol?.size !== undefined) style.pointRadius = (symbol.size * POINTS_TO_PIXELS) / 2
  return { style, layerColour: renderer.type === 'simple' ? fill?.colour : undefined }
}
