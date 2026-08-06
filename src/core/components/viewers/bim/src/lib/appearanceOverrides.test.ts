// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import {
  bucketByAppearance,
  clearSourceOverrides,
  findOverride,
  removeOverride,
  resolveAppearance,
  touchedIdsByModel,
  upsertOverride,
  type AppearanceOverride,
  type AppearanceSource,
} from './appearanceOverrides'
import { createModelIdMap, type BimTreeNode, type ModelIdMap } from './bimTree'

const RED = 0xff_00_00
const BLUE = 0x00_00_ff

function node(
  id: string,
  label: string,
  items: ModelIdMap = {},
  children: BimTreeNode[] = [],
): BimTreeNode {
  return { id, label, items, children }
}

/** Level 00 holds a wall (10) and a slab (11); Level 01 holds a door (12). */
function spatial(): BimTreeNode[] {
  return [
    node('m:1', 'Building A', createModelIdMap('m', [1]), [
      node('m:2', 'Level 00', createModelIdMap('m', [2]), [
        node('m:10', 'Basic Wall:Generic 200mm', createModelIdMap('m', [10])),
        node('m:11', 'Floor:Concrete', createModelIdMap('m', [11])),
      ]),
      node('m:3', 'Level 01', createModelIdMap('m', [3]), [
        node('m:12', 'Single-Flush:0915x2134', createModelIdMap('m', [12])),
      ]),
    ]),
  ]
}

/** The same wall (10) reached by class instead of by containment. */
function ifcClasses(): BimTreeNode[] {
  return [
    node('ifc-class:IFCWALL', 'IFCWALL', createModelIdMap('m', [10])),
    node('ifc-class:IFCDOOR', 'IFCDOOR', createModelIdMap('m', [12])),
  ]
}

function trees(): Record<AppearanceSource, BimTreeNode[]> {
  return { 'spatial': spatial(), 'ifc-class': ifcClasses() }
}

function override(
  source: AppearanceSource,
  nodeId: string,
  seq: number,
  appearance: { color?: number, opacity?: number },
): AppearanceOverride {
  return { source, nodeId, seq, ...appearance }
}

describe('resolveAppearance', () => {
  it('cascades a node override to its whole subtree', () => {
    const resolved = resolveAppearance(
      [override('spatial', 'm:2', 0, { color: RED })],
      trees(),
    )

    const perModel = resolved.get('m')
    expect(perModel?.get(2)).toEqual({ color: RED })
    expect(perModel?.get(10)).toEqual({ color: RED })
    expect(perModel?.get(11)).toEqual({ color: RED })
  })

  it('leaves elements outside the subtree alone', () => {
    const resolved = resolveAppearance(
      [override('spatial', 'm:2', 0, { color: RED })],
      trees(),
    )

    expect(resolved.get('m')?.has(12)).toBe(false)
  })

  it('lets a descendant keep its own colour when the parent is coloured after it', () => {
    const resolved = resolveAppearance(
      [
        override('spatial', 'm:10', 0, { color: BLUE }),
        override('spatial', 'm:2', 1, { color: RED }),
      ],
      trees(),
    )

    expect(resolved.get('m')?.get(10)).toEqual({ color: BLUE })
    expect(resolved.get('m')?.get(11)).toEqual({ color: RED })
  })

  it('lets a descendant keep its own colour when the parent was coloured first', () => {
    const resolved = resolveAppearance(
      [
        override('spatial', 'm:2', 0, { color: RED }),
        override('spatial', 'm:10', 1, { color: BLUE }),
      ],
      trees(),
    )

    expect(resolved.get('m')?.get(10)).toEqual({ color: BLUE })
    expect(resolved.get('m')?.get(11)).toEqual({ color: RED })
  })

  it('merges a half override over what it inherits', () => {
    const resolved = resolveAppearance(
      [
        override('spatial', 'm:2', 0, { color: RED }),
        override('spatial', 'm:10', 1, { opacity: 0.3 }),
      ],
      trees(),
    )

    // The wall keeps the storey's colour and gains its own opacity.
    expect(resolved.get('m')?.get(10)).toEqual({ color: RED, opacity: 0.3 })
    expect(resolved.get('m')?.get(11)).toEqual({ color: RED })
  })

  it('gives the overlap to the most recently touched tree', () => {
    const classLast = resolveAppearance(
      [
        override('spatial', 'm:10', 0, { color: RED }),
        override('ifc-class', 'ifc-class:IFCWALL', 1, { color: BLUE }),
      ],
      trees(),
    )
    expect(classLast.get('m')?.get(10)?.color).toBe(BLUE)

    const spatialLast = resolveAppearance(
      [
        override('ifc-class', 'ifc-class:IFCWALL', 0, { color: BLUE }),
        override('spatial', 'm:10', 1, { color: RED }),
      ],
      trees(),
    )
    expect(spatialLast.get('m')?.get(10)?.color).toBe(RED)
  })

  it('hands the overlap back to the other tree when the winner is undone', () => {
    const remaining = [override('ifc-class', 'ifc-class:IFCWALL', 0, { color: BLUE })]

    expect(resolveAppearance(remaining, trees()).get('m')?.get(10)?.color).toBe(BLUE)
  })

  it('skips overrides whose node is no longer in the tree', () => {
    const resolved = resolveAppearance(
      [
        override('spatial', 'gone:99', 0, { color: RED }),
        override('spatial', 'm:11', 1, { color: BLUE }),
      ],
      trees(),
    )

    expect(resolved.get('m')?.get(11)).toEqual({ color: BLUE })
    expect(resolved.get('m')?.size).toBe(1)
  })

  it('returns an empty map when nothing is overridden', () => {
    expect(resolveAppearance([], trees()).size).toBe(0)
  })
})

describe('bucketByAppearance', () => {
  it('groups elements sharing an appearance into one call', () => {
    const buckets = bucketByAppearance(
      resolveAppearance([override('spatial', 'm:2', 0, { color: RED })], trees()),
    )

    expect(buckets).toHaveLength(1)
    expect(buckets[0].modelId).toBe('m')
    expect(buckets[0].appearance).toEqual({ color: RED })
    expect([...buckets[0].localIds].sort((a, b) => a - b)).toEqual([2, 10, 11])
  })

  it('splits elements whose appearance differs', () => {
    const buckets = bucketByAppearance(
      resolveAppearance(
        [
          override('spatial', 'm:2', 0, { color: RED }),
          override('spatial', 'm:10', 1, { color: BLUE }),
        ],
        trees(),
      ),
    )

    expect(buckets).toHaveLength(2)
    const blue = buckets.find(b => b.appearance.color === BLUE)
    expect(blue?.localIds).toEqual([10])
  })

  it('keeps models apart even when their appearance matches', () => {
    const resolved = resolveAppearance(
      [override('spatial', 'both:1', 0, { color: RED })],
      {
        'spatial': [
          node('both:1', 'Federated', {
            a: new Set([1]),
            b: new Set([2]),
          }),
        ],
        'ifc-class': [],
      },
    )

    const buckets = bucketByAppearance(resolved)
    expect(buckets).toHaveLength(2)
    expect(buckets.map(b => b.modelId).sort()).toEqual(['a', 'b'])
  })
})

describe('touchedIdsByModel', () => {
  it('lists every element the pass paints, so the reset can be scoped', () => {
    const touched = touchedIdsByModel(
      resolveAppearance([override('spatial', 'm:3', 0, { opacity: 0.5 })], trees()),
    )

    expect([...(touched.get('m') ?? [])].sort((a, b) => a - b)).toEqual([3, 12])
  })
})

describe('upsertOverride', () => {
  it('merges into the existing record rather than replacing it', () => {
    const withColor = upsertOverride([], 'spatial', 'm:10', { color: RED }, 0)
    const withBoth = upsertOverride(withColor, 'spatial', 'm:10', { opacity: 0.4 }, 1)

    expect(withBoth).toHaveLength(1)
    expect(withBoth[0]).toMatchObject({ color: RED, opacity: 0.4, seq: 1 })
  })

  it('moves the touched node to the end so its tree counts as most recent', () => {
    const list = upsertOverride(
      upsertOverride([], 'spatial', 'm:10', { color: RED }, 0),
      'spatial',
      'm:11',
      { color: BLUE },
      1,
    )

    expect(list.map(o => o.nodeId)).toEqual(['m:10', 'm:11'])
    expect(upsertOverride(list, 'spatial', 'm:10', { color: BLUE }, 2).map(o => o.nodeId))
      .toEqual(['m:11', 'm:10'])
  })

  it('keeps a record per tree when both use the same node id', () => {
    const list = upsertOverride(
      upsertOverride([], 'spatial', 'shared', { color: RED }, 0),
      'ifc-class',
      'shared',
      { color: BLUE },
      1,
    )

    expect(list).toHaveLength(2)
  })
})

describe('removeOverride / clearSourceOverrides / findOverride', () => {
  const list: AppearanceOverride[] = [
    override('spatial', 'm:10', 0, { color: RED }),
    override('ifc-class', 'ifc-class:IFCWALL', 1, { color: BLUE }),
  ]

  it('removes one node', () => {
    expect(removeOverride(list, 'spatial', 'm:10')).toHaveLength(1)
  })

  it('clears one tree and leaves the other alone', () => {
    const cleared = clearSourceOverrides(list, 'spatial')

    expect(cleared).toHaveLength(1)
    expect(cleared[0].source).toBe('ifc-class')
  })

  it('finds a node override by tree and id', () => {
    expect(findOverride(list, 'spatial', 'm:10')?.color).toBe(RED)
    expect(findOverride(list, 'spatial', 'ifc-class:IFCWALL')).toBeUndefined()
  })
})
