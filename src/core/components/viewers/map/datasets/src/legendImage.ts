// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { toHex } from '../../../../../utils/colourUtils'

interface Pixels {
  width: number
  height: number
  data: Uint8ClampedArray
}

interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface LegendSlice {
  colour: string
  label: Box
}

const MIN_SWATCH_PX = 6
const BACKGROUND_TOLERANCE = 40

function pixelAt({ width, data }: Pixels, x: number, y: number): [number, number, number, number] {
  const i = (y * width + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

function backgroundTest(pixels: Pixels): (x: number, y: number) => boolean {
  const [br, bg, bb] = pixelAt(pixels, 0, 0)
  return (x, y) => {
    const [r, g, b, a] = pixelAt(pixels, x, y)
    return a < 16 || Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb) < BACKGROUND_TOLERANCE
  }
}

function swatchColumn(pixels: Pixels, isBackground: (x: number, y: number) => boolean): number | null {
  for (let x = 0; x < Math.min(pixels.width, 48); x += 1) {
    let filled = 0
    for (let y = 0; y < pixels.height; y += 1) if (!isBackground(x, y)) filled += 1
    if (filled >= MIN_SWATCH_PX) return Math.min(x + 2, pixels.width - 1)
  }
  return null
}

function verticalRuns(height: number, filledAt: (y: number) => boolean): Array<[number, number]> {
  const runs: Array<[number, number]> = []
  let start = -1
  for (let y = 0; y <= height; y += 1) {
    const filled = y < height && filledAt(y)
    if (filled && start < 0) start = y
    if (!filled && start >= 0) {
      if (y - start >= MIN_SWATCH_PX) runs.push([start, y - 1])
      start = -1
    }
  }
  return runs
}

function contentBox(isBackground: (x: number, y: number) => boolean, [x0, y0, x1, y1]: number[]): Box | null {
  let left = Infinity, top = Infinity, right = -1, bottom = -1
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (isBackground(x, y)) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  return right < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

/** Splits a server-drawn legend of swatches stacked beside their labels into entries; null for any other layout. */
export function sliceLegendImage(pixels: Pixels): LegendSlice[] | null {
  const isBackground = backgroundTest(pixels)
  const probeX = swatchColumn(pixels, isBackground)
  if (probeX === null) return null
  const runs = verticalRuns(pixels.height, y => !isBackground(probeX, y))
  const slices: LegendSlice[] = []
  for (const [index, [top, bottom]] of runs.entries()) {
    const middle = Math.round((top + bottom) / 2)
    let swatchRight = probeX
    while (swatchRight + 1 < pixels.width && !isBackground(swatchRight + 1, middle)) swatchRight += 1
    const [r, g, b] = pixelAt(pixels, Math.round((probeX + swatchRight) / 2), middle)
    const rowBottom = index + 1 < runs.length ? runs[index + 1][0] - 1 : pixels.height - 1
    const label = contentBox(isBackground, [swatchRight + 2, top, pixels.width - 1, rowBottom])
    if (!label) return null
    slices.push({ colour: toHex({ r, g, b }), label })
  }
  return slices.length > 0 ? slices : null
}
