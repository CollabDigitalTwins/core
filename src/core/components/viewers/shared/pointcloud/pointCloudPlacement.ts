// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export type PointCloudSourceUp = 'y' | 'z'

/** Where a point cloud sits in BIM world space. Metres and radians, XYZ Euler. */
export interface PointCloudPlacement {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  sourceUp: PointCloudSourceUp
}

export const DEFAULT_PLACEMENT: PointCloudPlacement = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
  sourceUp: 'z',
}

function toTriple(value: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) return [...fallback]
  if (!value.every((n) => typeof n === 'number' && Number.isFinite(n))) return [...fallback]
  return [value[0], value[1], value[2]]
}

export function parsePlacement(stored: unknown): PointCloudPlacement {
  if (typeof stored !== 'object' || stored === null) return { ...DEFAULT_PLACEMENT }
  const raw = stored as Record<string, unknown>
  const scale = typeof raw.scale === 'number' && Number.isFinite(raw.scale) && raw.scale > 0
    ? raw.scale
    : DEFAULT_PLACEMENT.scale

  return {
    position: toTriple(raw.position, DEFAULT_PLACEMENT.position),
    rotation: toTriple(raw.rotation, DEFAULT_PLACEMENT.rotation),
    scale,
    sourceUp: raw.sourceUp === 'y' || raw.sourceUp === 'z' ? raw.sourceUp : DEFAULT_PLACEMENT.sourceUp,
  }
}
