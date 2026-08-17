// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { LayerColors } from '../../../../types/datasetTypes'

/** Map-friendly, colourblind-accessible colours. Re-exported through `plugins-sdk`. */
export const MAP_COLOUR_PALETTE = [
    '#1b9e77', // teal
    '#d95f02', // orange
    '#7570b3', // purple
    '#e7298a', // pink
    '#66a61e', // green
    '#e6ab02', // yellow
    '#a6761d', // brown
    '#377eb8', // blue
    '#ff7f00', // bright orange
    '#41b6c4', // cyan
    '#f46d43', // coral
    '#7fc97f', // light green
    '#beaed4', // lavender
    '#fdc086', // peach
    '#ffff99', // pale yellow
    '#386cb0', // strong blue
    '#f0027f', // magenta
    '#bf5b17', // dark brown
    '#6666ff', // periwinkle
    '#e41a1c', // strong red
    '#4daf4a', // vivid green
    '#984ea3', // deep purple
    '#ffea00', // vivid yellow
    '#a65628', // chestnut
    '#f781bf', // light magenta
    '#0173b2', // steel blue
    '#de8f05', // ochre
    '#029e73', // emerald
    '#d55e00', // vermillion
    '#cc78bc', // amethyst
    '#ca9161', // sand
    '#fbafe4', // pastel pink
    '#8dd3c7', // turquoise
    '#ccebc5', // mint
  ] as const

/** A stable colour from `MAP_COLOUR_PALETTE`, chosen by hashing the string. */
export const stringToColour = (str: string, variant?: 'min' | 'max') => {
  const palette = MAP_COLOUR_PALETTE

  // Simple hash to index
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % palette.length
  const baseColour = palette[index]

  // No default lightening, just use as-is for good contrast
  let colour: string = baseColour

  // Optionally adjust for variant
  if (variant === 'min') {
    // Slightly lighten color
    colour = lighten(colour, 0.3)
  }
  else if (variant === 'max') {
    // Slightly darken color
    colour = darken(colour, 0.3)
  }

  return colour
}

// Helper to lighten hex color
function lighten(hex: string, amount: number) {
  return adjustColor(hex, amount)
}

// Helper to darken hex color
function darken(hex: string, amount: number) {
  return adjustColor(hex, -amount)
}

// Adjust color brightness
function adjustColor(hex: string, amount: number) {
  let usePound = false
  if (hex[0] === '#') {
    hex = hex.slice(1)
    usePound = true
  }
  const num = Number.parseInt(hex, 16)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + Math.round(255 * amount)))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + Math.round(255 * amount)))
  const b = Math.min(255, Math.max(0, (num & 0xFF) + Math.round(255 * amount)))
  return (usePound ? '#' : '') + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

export const layerColorByName = (name: string): LayerColors => {
  // Use the stringToColour function to generate a color based on the name
  return {
    color: stringToColour(name),
    nameColor: stringToColour(name),
    minColor: stringToColour(name, 'min'),
    maxColor: stringToColour(name, 'max'),
  }
}
