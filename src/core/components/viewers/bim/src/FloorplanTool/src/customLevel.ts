// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { FloorplanEntry } from './types'

export const CUSTOM_LEVEL_ABOVE = 1.5
export const CUSTOM_LEVEL_BELOW = 0.5

const CUSTOM_MARKER = '::custom::'

/** A cut plane with no IFC storey behind it; the projector then falls back to the whole model. */
export function makeCustomLevel(modelId: string, elevation: number, name: string): FloorplanEntry {
  return {
    id: `${modelId}${CUSTOM_MARKER}${crypto.randomUUID()}`,
    name,
    elevation,
    modelId,
    drawing: null,
    projected: false,
    layers: [],
    above: CUSTOM_LEVEL_ABOVE,
    below: CUSTOM_LEVEL_BELOW,
  }
}

/** Only a custom level may have its elevation moved, so the sidebar asks before offering the control. */
export function isCustomLevel(entry: Pick<FloorplanEntry, 'id'>): boolean {
  return entry.id.includes(CUSTOM_MARKER) && !entry.id.startsWith(CUSTOM_MARKER)
}

/** Where the plan camera sits, where the model is clipped, and the depth that spans both. */
export function cutVolumeFor(entry: Pick<FloorplanEntry, 'elevation' | 'above' | 'below'>) {
  const above = entry.above ?? CUSTOM_LEVEL_ABOVE
  const below = entry.below ?? CUSTOM_LEVEL_BELOW
  return {
    planeY: entry.elevation + above,
    cutY: entry.elevation - below,
    far: above + below + 1,
  }
}
