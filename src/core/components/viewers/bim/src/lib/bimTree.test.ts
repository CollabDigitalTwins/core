// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import {
  allNodeIds,
  collectItems,
  createModelIdMap,
  filterTree,
  isModelIdMapEmpty,
  mergeModelIdMap,
  modelIdMapSize,
  nodeVisibility,
  subtreeItems,
  type BimTreeNode,
  type ModelIdMap,
} from './bimTree'

function node(
  id: string,
  label: string,
  items: ModelIdMap = {},
  children: BimTreeNode[] = [],
): BimTreeNode {
  return { id, label, items, children }
}

/** Level 00 holds a wall and a slab, Level 01 holds a door. */
function building(): BimTreeNode {
  return node('m:1', 'Building A', createModelIdMap('m', [1]), [
    node('m:2', 'Level 00', createModelIdMap('m', [2]), [
      node('m:10', 'Basic Wall:Generic 200mm', createModelIdMap('m', [10])),
      node('m:11', 'Floor:Concrete', createModelIdMap('m', [11])),
    ]),
    node('m:3', 'Level 01', createModelIdMap('m', [3]), [
      node('m:12', 'Single-Flush:0915x2134', createModelIdMap('m', [12])),
    ]),
  ])
}

describe('mergeModelIdMap', () => {
  it('unions sets per model and copies models the target lacks', () => {
    const target = { a: new Set([1, 2]) }
    mergeModelIdMap(target, { a: new Set([2, 3]), b: new Set([9]) })

    expect([...target.a]).toEqual([1, 2, 3])
    expect([...(target as ModelIdMap).b]).toEqual([9])
  })

  it('copies the source set rather than aliasing it', () => {
    const source = { b: new Set([1]) }
    const target: ModelIdMap = {}
    mergeModelIdMap(target, source)
    source.b.add(2)

    expect([...target.b]).toEqual([1])
  })
})

describe('modelIdMapSize / isModelIdMapEmpty', () => {
  it('counts across models', () => {
    expect(modelIdMapSize({ a: new Set([1, 2]), b: new Set([3]) })).toBe(3)
  })

  it('treats a map of empty sets as empty', () => {
    expect(isModelIdMapEmpty({})).toBe(true)
    expect(isModelIdMapEmpty({ a: new Set() })).toBe(true)
    expect(isModelIdMapEmpty({ a: new Set([1]) })).toBe(false)
  })
})

describe('subtreeItems', () => {
  it('unions the node with every descendant', () => {
    const tree = building()
    expect([...subtreeItems(tree).m]).toEqual([1, 2, 10, 11, 3, 12])
  })

  it('returns the same object on repeat calls so rows do not re-walk the tree', () => {
    const tree = building()
    expect(subtreeItems(tree)).toBe(subtreeItems(tree))
  })

  it('spans models when roots come from different files', () => {
    const roots = [
      node('arq:1', 'Arq', createModelIdMap('arq', [1])),
      node('str:1', 'Str', createModelIdMap('str', [7])),
    ]
    const items = collectItems(roots)

    expect([...items.arq]).toEqual([1])
    expect([...items.str]).toEqual([7])
  })
})

describe('allNodeIds', () => {
  it('lists every id depth-first for expand-all', () => {
    expect(allNodeIds([building()])).toEqual([
      'm:1', 'm:2', 'm:10', 'm:11', 'm:3', 'm:12',
    ])
  })
})

describe('nodeVisibility', () => {
  it('reports visible when nothing in the subtree is hidden', () => {
    expect(nodeVisibility(building(), {})).toBe('visible')
  })

  it('reports hidden only when the whole subtree is hidden', () => {
    const tree = building()
    const hidden = { m: new Set([1, 2, 3, 10, 11, 12]) }

    expect(nodeVisibility(tree, hidden)).toBe('hidden')
  })

  it('reports partial when only part of the subtree is hidden', () => {
    const tree = building()
    const hidden = { m: new Set([10]) }

    expect(nodeVisibility(tree, hidden)).toBe('partial')
    expect(nodeVisibility(tree.children[0], hidden)).toBe('partial')
    expect(nodeVisibility(tree.children[1], hidden)).toBe('visible')
  })

  it('treats a node with no items as visible', () => {
    expect(nodeVisibility(node('x', 'Empty'), { m: new Set([1]) })).toBe('visible')
  })
})

describe('filterTree', () => {
  it('returns the input untouched for an empty query', () => {
    const roots = [building()]
    const result = filterTree(roots, '   ')

    expect(result.nodes).toBe(roots)
    expect(result.expandIds.size).toBe(0)
  })

  it('keeps only branches leading to a match', () => {
    const result = filterTree([building()], 'door')
    expect(result.nodes).toHaveLength(0)

    const doors = filterTree([building()], 'single-flush')
    expect(doors.nodes[0].children.map(child => child.label)).toEqual(['Level 01'])
    expect(doors.nodes[0].children[0].children.map(child => child.label))
      .toEqual(['Single-Flush:0915x2134'])
  })

  it('expands the full ancestor chain of a deep match, not just its parent', () => {
    const result = filterTree([building()], 'single-flush')

    // 'm:1' is the grandparent — the old implementation only opened 'm:3'.
    expect([...result.expandIds].sort()).toEqual(['m:1', 'm:3'])
  })

  it('matches case-insensitively', () => {
    expect(filterTree([building()], 'LEVEL 00').nodes).toHaveLength(1)
  })

  it('keeps a matched node browsable instead of emptying it', () => {
    const result = filterTree([building()], 'level 00')
    const level00 = result.nodes[0].children[0]

    expect(level00.children.map(child => child.label))
      .toEqual(['Basic Wall:Generic 200mm', 'Floor:Concrete'])
    // ...and it is not auto-expanded, so the hit itself stays readable.
    expect(result.expandIds.has('m:2')).toBe(false)
  })

  it('keeps the unfiltered subtree in items so hiding a pruned branch is complete', () => {
    const result = filterTree([building()], 'level 00')
    const buildingA = result.nodes[0]

    // Level 01 was pruned from the view...
    expect(buildingA.children.map(child => child.label)).toEqual(['Level 00'])
    // ...but hiding Building A must still cover the door underneath it.
    expect([...subtreeItems(buildingA).m]).toEqual([1, 2, 10, 11, 3, 12])
  })

  it('reuses node identity when a branch is not pruned', () => {
    const roots = [building()]
    const result = filterTree(roots, 'building a')

    expect(result.nodes[0]).toBe(roots[0])
  })
})
