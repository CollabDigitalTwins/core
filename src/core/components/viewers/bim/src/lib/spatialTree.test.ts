// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { subtreeItems } from './bimTree'
import {
  buildSpatialTree,
  collectSpatialLocalIds,
  nameMapFromItemsData,
} from './spatialTree'

import type * as FRAGS from '@thatopen/fragments'

/**
 * Fixtures use the shape `FragmentsModel.getSpatialStructure()` actually
 * returns: `{ category, localId, children? }` — no `Name`, no `type`, and
 * `children` absent rather than `[]` on a leaf.
 */
function item(
  category: string | null,
  localId: number | null,
  children?: FRAGS.SpatialTreeItem[],
): FRAGS.SpatialTreeItem {
  const node: FRAGS.SpatialTreeItem = { category, localId }
  if (children) node.children = children
  return node
}

function project(): FRAGS.SpatialTreeItem {
  return item('IFCPROJECT', 1, [
    item('IFCSITE', 2, [
      item('IFCBUILDING', 3, [
        item('IFCBUILDINGSTOREY', 4, [
          item('IFCWALLSTANDARDCASE', 10),
          item('IFCSLAB', 11),
        ]),
        item('IFCBUILDINGSTOREY', 5, [item('IFCDOOR', 12)]),
      ]),
    ]),
  ])
}

describe('collectSpatialLocalIds', () => {
  it('collects every node, not only nodes missing a category', () => {
    // The old guard required `!item.category`, which is never true in practice,
    // so the name lookup never ran and every row fell back to its IFC class.
    expect(collectSpatialLocalIds(project())).toEqual([1, 2, 3, 4, 10, 11, 5, 12])
  })

  it('keeps localId 0 and skips null ids', () => {
    const root = item('IFCBUILDING', 0, [item('IFCWALL', null), item('IFCSLAB', 7)])
    expect(collectSpatialLocalIds(root)).toEqual([0, 7])
  })

  it('does not throw on a leaf with no children key', () => {
    expect(collectSpatialLocalIds(item('IFCWALL', 9))).toEqual([9])
  })
})

describe('buildSpatialTree', () => {
  it('roots at the building and keeps storeys', () => {
    const [building] = buildSpatialTree(project(), 'arq')

    expect(building.category).toBe('IFCBUILDING')
    expect(building.children.map(child => child.category))
      .toEqual(['IFCBUILDINGSTOREY', 'IFCBUILDINGSTOREY'])
    expect(building.children[0].children.map(child => child.category))
      .toEqual(['IFCWALLSTANDARDCASE', 'IFCSLAB'])
  })

  it('uses resolved names and falls back to the IFC category', () => {
    const names = new Map([
      [3, 'Building A'],
      [4, 'Level 00'],
      [10, 'Basic Wall:Generic 200mm'],
    ])
    const [building] = buildSpatialTree(project(), 'arq', names)

    expect(building.label).toBe('Building A')
    expect(building.children[0].label).toBe('Level 00')
    expect(building.children[0].children[0].label).toBe('Basic Wall:Generic 200mm')
    // No name for the slab, so the category shows instead.
    expect(building.children[0].children[1].label).toBe('IFCSLAB')
  })

  it('ignores blank names', () => {
    const [building] = buildSpatialTree(project(), 'arq', new Map([[3, '   ']]))
    expect(building.label).toBe('IFCBUILDING')
  })

  it('returns every building, not just the first', () => {
    const root = item('IFCPROJECT', 1, [
      item('IFCSITE', 2, [item('IFCBUILDING', 3), item('IFCBUILDING', 4)]),
    ])

    expect(buildSpatialTree(root, 'arq').map(node => node.id))
      .toEqual(['arq:3', 'arq:4'])
  })

  it('returns nothing when the model has no building', () => {
    const root = item('IFCPROJECT', 1, [item('IFCSITE', 2)])

    expect(buildSpatialTree(root, 'arq')).toEqual([])
    expect(buildSpatialTree(null, 'arq')).toEqual([])
  })

  it('namespaces ids by model so two files never collide', () => {
    const [arq] = buildSpatialTree(project(), 'arq')
    const [str] = buildSpatialTree(project(), 'str')

    expect(arq.id).toBe('arq:3')
    expect(str.id).toBe('str:3')
  })

  it('keeps localId 0 selectable', () => {
    const root = item('IFCBUILDING', 0, [item('IFCWALL', 10)])
    const [building] = buildSpatialTree(root, 'arq')

    expect(building.id).toBe('arq:0')
    expect([...building.items.arq]).toEqual([0])
  })

  it('gives ids to nodes without a localId without colliding on equal names', () => {
    const root = item('IFCBUILDING', 3, [item('IFCSPACE', null), item('IFCSPACE', null)])
    const [building] = buildSpatialTree(root, 'arq')

    const [first, second] = building.children
    expect(first.id).not.toBe(second.id)
    expect(first.items).toEqual({})
  })

  it('rolls the whole building up for hide and isolate', () => {
    const [building] = buildSpatialTree(project(), 'arq')

    expect([...subtreeItems(building).arq]).toEqual([3, 4, 10, 11, 5, 12])
  })
})

describe('nameMapFromItemsData', () => {
  it('pairs ids with results by index', () => {
    const names = nameMapFromItemsData(
      [10, 11, 12],
      [{ Name: { value: 'Wall' } }, {}, { Name: { value: 'Door' } }],
    )

    expect(names.get(10)).toBe('Wall')
    expect(names.has(11)).toBe(false)
    expect(names.get(12)).toBe('Door')
  })

  it('ignores blank and non-string values', () => {
    const names = nameMapFromItemsData(
      [1, 2, 3],
      [{ Name: { value: '  ' } }, { Name: { value: 42 } }, { Name: {} }],
    )

    expect(names.size).toBe(0)
  })

  it('tolerates a short results array', () => {
    expect(nameMapFromItemsData([1, 2], [{ Name: { value: 'Wall' } }]).size).toBe(1)
  })
})
