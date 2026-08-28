// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { DEFAULT_PLACEMENT } from '../../../shared/pointcloud/pointCloudPlacement'


import { placementPatch, PLACEMENT_VERSION, readPlacement, samePlacement } from './pointCloudPlacementStore'

import type { DbFile } from '../../../../../types/dbTypes'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'

const file = (pointCloudTransform: unknown) => ({ pointCloudTransform } as Pick<DbFile, 'pointCloudTransform'>)

const PLACED: PointCloudPlacement = { position: [1, 2, 3], rotation: [0, 0.5, 0], scale: 2, sourceUp: 'z' }

describe('readPlacement', () => {
  it('reads a stored placement back', () => {
    expect(readPlacement(file({ version: 1, ...PLACED }))).toEqual(PLACED)
  })

  it('accepts the blob as a JSON string, which is how some drivers hand back Json columns', () => {
    expect(readPlacement(file(JSON.stringify(PLACED)))).toEqual(PLACED)
  })

  it('falls back to the default for a null column, a missing file or unparseable text', () => {
    expect(readPlacement(file(null))).toEqual(DEFAULT_PLACEMENT)
    expect(readPlacement(undefined)).toEqual(DEFAULT_PLACEMENT)
    expect(readPlacement(file('not json'))).toEqual(DEFAULT_PLACEMENT)
  })

  it('keeps the fields it understands when the blob is partly wrong', () => {
    const read = readPlacement(file({ position: [4, 5, 6], rotation: 'nope', scale: -1 }))

    expect(read.position).toEqual([4, 5, 6])
    expect(read.rotation).toEqual(DEFAULT_PLACEMENT.rotation)
    expect(read.scale).toBe(DEFAULT_PLACEMENT.scale)
  })
})

describe('placementPatch', () => {
  it('stamps a version so a later format can be told apart', () => {
    expect(placementPatch({ ...PLACED })).toEqual({
      pointCloudTransform: { version: PLACEMENT_VERSION, ...PLACED },
    })
  })

  it('round-trips through readPlacement', () => {
    const patch = placementPatch({ ...PLACED })
    expect(readPlacement(file(patch.pointCloudTransform))).toEqual(PLACED)
  })
})

describe('samePlacement', () => {
  it('matches an untouched placement so a no-op alignment writes nothing', () => {
    expect(samePlacement({ ...DEFAULT_PLACEMENT }, { ...DEFAULT_PLACEMENT })).toBe(true)
    expect(samePlacement({ ...PLACED }, readPlacement(file({ version: 1, ...PLACED })))).toBe(true)
  })

  it('separates placements that differ in any field', () => {
    expect(samePlacement({ ...DEFAULT_PLACEMENT }, { ...DEFAULT_PLACEMENT, position: [0, 1, 0] })).toBe(false)
    expect(samePlacement({ ...DEFAULT_PLACEMENT }, { ...DEFAULT_PLACEMENT, rotation: [0, 1, 0] })).toBe(false)
    expect(samePlacement({ ...DEFAULT_PLACEMENT }, { ...DEFAULT_PLACEMENT, scale: 2 })).toBe(false)
    expect(samePlacement({ ...DEFAULT_PLACEMENT }, { ...DEFAULT_PLACEMENT, sourceUp: 'y' })).toBe(false)
  })
})
