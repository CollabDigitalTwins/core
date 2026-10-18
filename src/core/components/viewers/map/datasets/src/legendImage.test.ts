// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { sliceLegendImage } from './legendImage'

type Rgb = [number, number, number]

function image(width: number, height: number, paint: (x: number, y: number) => Rgb | undefined) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y) ?? [255, 255, 255]
      data.set([r, g, b, 255], (y * width + x) * 4)
    }
  }
  return { width, height, data }
}

const inside = (x: number, y: number, [x0, y0, x1, y1]: number[]) => x >= x0 && x <= x1 && y >= y0 && y <= y1

describe('sliceLegendImage', () => {
  it('finds each swatch with its colour and the label beside it', () => {
    const legend = image(80, 60, (x, y) => {
      if (inside(x, y, [2, 2, 30, 24])) return [230, 0, 0]
      if (inside(x, y, [2, 32, 30, 54])) return [0, 0, 200]
      if (inside(x, y, [36, 18, 70, 23]) || inside(x, y, [36, 48, 60, 53])) return [0, 0, 0]
      return undefined
    })
    expect(sliceLegendImage(legend)).toEqual([
      { colour: '#e60000', label: { x: 36, y: 18, width: 35, height: 6 } },
      { colour: '#0000c8', label: { x: 36, y: 48, width: 25, height: 6 } },
    ])
  })

  it('gives up on an image that is not swatches stacked beside labels', () => {
    expect(sliceLegendImage(image(40, 40, () => undefined))).toBeNull()
    expect(sliceLegendImage(image(40, 40, (x, y) => (inside(x, y, [2, 2, 30, 30]) ? [10, 10, 10] : undefined)))).toBeNull()
  })
})
