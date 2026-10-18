// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { FlatBounds } from '../../utils/validateBounds'

export const TILE_ZOOM = 11
const MAX_TILES_PER_VIEW = 64

export interface Tile {
  x: number
  y: number
  z: number
}

const MAX_LATITUDE = 85.05112878

function tileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z)
}

function tileY(lat: number, z: number): number {
  const clamped = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat))
  const radians = (clamped * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * 2 ** z)
}

function tileLon(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180
}

function tileLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z
  return (180 / Math.PI) * Math.atan(Math.sinh(n))
}

export function tileBounds({ x, y, z }: Tile): FlatBounds {
  return [tileLon(x, z), tileLat(y + 1, z), tileLon(x + 1, z), tileLat(y, z)]
}

export function tileKey({ x, y, z }: Tile): string {
  return `${z}/${x}/${y}`
}

/** The fixed-zoom tiles covering `bbox`, so repeated pans reuse the same cache keys; null when the view needs too many. */
export function tilesCovering(bbox: FlatBounds, z = TILE_ZOOM, maxTiles = MAX_TILES_PER_VIEW): Tile[] | null {
  const [west, south, east, north] = bbox
  const last = 2 ** z - 1
  const minX = Math.max(0, tileX(west, z))
  const maxX = Math.min(last, tileX(east, z))
  const minY = Math.max(0, tileY(north, z))
  const maxY = Math.min(last, tileY(south, z))
  if ((maxX - minX + 1) * (maxY - minY + 1) > maxTiles) return null
  const tiles: Tile[] = []
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) tiles.push({ x, y, z })
  }
  return tiles
}
