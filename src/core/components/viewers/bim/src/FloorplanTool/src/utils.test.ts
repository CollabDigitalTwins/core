// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { anchorStoreyElevations, getStoreyItemIds, normalizeElevation, planLineClasses, storeyContentIds, storeyFloorY } from './utils'

import type * as FRAGS from '@thatopen/fragments'

describe('normalizeElevation', () => {
  // Bounds for these tests: minY=0, maxY=10
  it('returns the raw elevation when it is in-bounds without coord adjustment', () => {
    // raw=5, coordHeight=1000 (out of range with coord). raw alone is in-bounds → returned.
    expect(normalizeElevation(5, 1000, 0, 10)).toBe(5)
  })

  it('returns the coord-adjusted elevation when only that is in-bounds', () => {
    // raw=-100 (out), coordHeight=105 → elevWithCoord=5 (in).
    expect(normalizeElevation(-100, 105, 0, 10)).toBe(5)
  })

  it('returns the coord-adjusted elevation when both are in-bounds (default)', () => {
    expect(normalizeElevation(5, 1, 0, 10)).toBe(6)
  })

  it('converts millimetre-scale elevations to metres when far out of range', () => {
    // raw=5000 is far above maxY+200=210. inMeters=5 → in bounds. coordHeight=0 → returns 5.
    expect(normalizeElevation(5000, 0, 0, 10)).toBe(5)
  })

  it('leaves elevation alone if the metre conversion is also out of bounds', () => {
    // raw=100000, metres=100, still out of bounds → no conversion. Both raw and raw+coord out → returns raw+coord.
    expect(normalizeElevation(100000, 0, 0, 10)).toBe(100000)
  })
})

const tree: FRAGS.SpatialTreeItem = {
  category: 'IFCPROJECT', localId: 1, children: [{
    category: 'IFCBUILDING', localId: 2, children: [
      { category: 'IFCBUILDINGSTOREY', localId: 10, children: [
        { category: 'IFCWALL', localId: null, children: [{ category: 'IFCWALL', localId: 11 }, { category: 'IFCWALL', localId: 12 }] },
        { category: 'IFCSPACE', localId: null, children: [{ category: 'IFCSPACE', localId: 13, children: [
          { category: 'IFCFURNISHINGELEMENT', localId: null, children: [{ category: 'IFCFURNISHINGELEMENT', localId: 14 }] },
        ] }] },
      ] },
      { category: 'IFCBUILDINGSTOREY', localId: 20, children: [{ category: 'IFCSLAB', localId: 21 }] },
    ],
  }],
}

describe('storeyContentIds', () => {
  it('returns the elements under the requested storey, including those placed in its spaces, but not the spaces', () => {
    expect(storeyContentIds(tree, 10)).toEqual([11, 12, 14])
    expect(storeyContentIds(tree, 20)).toEqual([21])
  })

  it('returns [] for a storey that is not in the tree', () => {
    expect(storeyContentIds(tree, 99)).toEqual([])
  })
})

describe('getStoreyItemIds', () => {
  it('reads the storey contents from the spatial structure', async () => {
    const model = { getSpatialStructure: vi.fn().mockResolvedValue(tree) }
    await expect(getStoreyItemIds(model, 20)).resolves.toEqual([21])
  })

  it('returns [] when the spatial structure is unavailable', async () => {
    const model = { getSpatialStructure: vi.fn().mockRejectedValue(new Error('not indexed')) }
    await expect(getStoreyItemIds(model, 10)).resolves.toEqual([])
  })
})

describe('storeyFloorY', () => {
  it('picks the most common base over a foundation wall reaching lower', () => {
    expect(storeyFloorY([3, 3.01, 3, 1.2])).toBeCloseTo(3)
  })

  it('returns null with nothing to anchor to', () => {
    expect(storeyFloorY([])).toBeNull()
  })
})

describe('anchorStoreyElevations', () => {
  it('shifts every storey by the offset its walls show, keeping the attribute spacing', () => {
    const result = anchorStoreyElevations([
      { rawElevation: -18.23, floorY: -2.6 },
      { rawElevation: -15.39, floorY: 0.24 },
      { rawElevation: 40, floorY: null },
    ])
    expect(result?.[0]).toBeCloseTo(-2.6)
    expect(result?.[1]).toBeCloseTo(0.24)
    expect(result?.[2]).toBeCloseTo(55.63)
  })

  it('reads millimetre attributes as metres', () => {
    const result = anchorStoreyElevations([
      { rawElevation: 0, floorY: 10 },
      { rawElevation: 4000, floorY: 14 },
    ])
    expect(result).toEqual([10, 14])
  })

  it('returns null when no storey has walls or columns', () => {
    expect(anchorStoreyElevations([{ rawElevation: 3, floorY: null }])).toBeNull()
  })
})

describe('planLineClasses', () => {
  it('leaves out floors and spaces, keeping what stands in the rooms', () => {
    const byClass = new Map([
      ['IFCWALL', [1]],
      ['IFCSLAB', [2]],
      ['IFCCOVERING', [3]],
      ['IFCSPACE', [4]],
      ['IFCSPACEHEATER', [5]],
      ['IFCFURNISHINGELEMENT', [6]],
    ])

    expect([...planLineClasses(byClass).keys()]).toEqual(['IFCWALL', 'IFCSPACEHEATER', 'IFCFURNISHINGELEMENT'])
  })
})
