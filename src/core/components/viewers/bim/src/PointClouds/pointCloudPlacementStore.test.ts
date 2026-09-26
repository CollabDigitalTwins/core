// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { SourceUpAxis } from '../../../../../types/dbTypes'
import { DEFAULT_PLACEMENT } from '../../../shared/pointcloud/pointCloudPlacement'

import { placementPatch, readPlacement, samePlacement } from './pointCloudPlacementStore'

import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'

const PLACED: PointCloudPlacement = { position: [1, 2, 3], rotation: [0, 0.5, 0], scale: 2, sourceUp: 'z' }
const PLACED_COLUMNS = {
  fileTransformX: 1,
  fileTransformY: 2,
  fileTransformZ: 3,
  fileRotationX: 0,
  fileRotationY: 0.5,
  fileRotationZ: 0,
  fileScale: 2,
  fileSourceUp: SourceUpAxis.z,
}

describe('readPlacement', () => {
  it('reads a stored placement back from the typed columns', () => {
    expect(readPlacement(PLACED_COLUMNS)).toEqual(PLACED)
  })

  it('falls back to the default for empty columns or a missing file', () => {
    expect(readPlacement({})).toEqual(DEFAULT_PLACEMENT)
    expect(readPlacement(undefined)).toEqual(DEFAULT_PLACEMENT)
  })

  it('keeps the columns it understands when others are null or invalid', () => {
    const read = readPlacement({ fileTransformX: 4, fileTransformY: 5, fileTransformZ: 6, fileRotationY: null, fileScale: -1 })

    expect(read.position).toEqual([4, 5, 6])
    expect(read.rotation).toEqual(DEFAULT_PLACEMENT.rotation)
    expect(read.scale).toBe(DEFAULT_PLACEMENT.scale)
  })
})

describe('placementPatch', () => {
  it('writes every transform column', () => {
    expect(placementPatch({ ...PLACED })).toEqual(PLACED_COLUMNS)
  })

  it('round-trips through readPlacement', () => {
    expect(readPlacement(placementPatch({ ...PLACED }))).toEqual(PLACED)
  })
})

describe('samePlacement', () => {
  it('matches an untouched placement so a no-op alignment writes nothing', () => {
    expect(samePlacement({ ...DEFAULT_PLACEMENT }, { ...DEFAULT_PLACEMENT })).toBe(true)
    expect(samePlacement({ ...PLACED }, readPlacement(PLACED_COLUMNS))).toBe(true)
  })

  it('separates placements that differ in any field', () => {
    expect(samePlacement({ ...DEFAULT_PLACEMENT }, { ...DEFAULT_PLACEMENT, position: [0, 1, 0] })).toBe(false)
    expect(samePlacement({ ...DEFAULT_PLACEMENT }, { ...DEFAULT_PLACEMENT, rotation: [0, 1, 0] })).toBe(false)
    expect(samePlacement({ ...DEFAULT_PLACEMENT }, { ...DEFAULT_PLACEMENT, scale: 2 })).toBe(false)
    expect(samePlacement({ ...DEFAULT_PLACEMENT }, { ...DEFAULT_PLACEMENT, sourceUp: 'y' })).toBe(false)
  })
})
