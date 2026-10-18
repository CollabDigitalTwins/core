// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { lerpHex } from '../../../../utils/colourUtils'

export const COLOUR_RAMPS = {
  viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
  magma: ['#000004', '#51127c', '#b73779', '#fc8961', '#fcfdbf'],
  blues: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
  greens: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
  reds: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
  oranges: ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'],
  redYellowBlue: ['#d7191c', '#fdae61', '#ffffbf', '#abd9e9', '#2c7bb6'],
} as const satisfies Record<string, readonly string[]>

export type ColourRampName = keyof typeof COLOUR_RAMPS

export const DEFAULT_COLOUR_RAMP: ColourRampName = 'viridis'

/** `count` colours spread evenly along a ramp's stops. */
export function sampleRamp(stops: readonly string[], count: number): string[] {
  if (count <= 1) return [stops[stops.length - 1]]
  return Array.from({ length: count }, (_, i) => {
    const position = (i / (count - 1)) * (stops.length - 1)
    const lower = Math.floor(position)
    return lerpHex(stops[lower], stops[Math.min(lower + 1, stops.length - 1)], position - lower)
  })
}
