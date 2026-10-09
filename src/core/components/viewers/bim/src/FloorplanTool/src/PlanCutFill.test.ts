// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'

import { PlanCutFill } from './PlanCutFill'

import type * as THREE from 'three'


function makeComponents() {
  const created = new Map<string, { visible: boolean }>()
  const styler = {
    world: null as unknown,
    styles: new Map(),
    list: { delete: (id: string) => created.delete(id) },
    create: (_plane: THREE.Plane, config: { id: string }) => {
      const edges = { visible: false }
      created.set(config.id, edges)
      return edges
    },
  }
  const model = { getItemsOfCategories: async () => ({ IFCWALL: [1, 2] }) }
  const classifier = { getGroupData: () => ({ map: {} }), addGroupItems: vi.fn() }
  const byClass = new Map<unknown, unknown>([
    [OBF.ClipStyler, styler],
    [OBC.FragmentsManager, { list: new Map([['a', model], ['b', model]]) }],
    [OBC.Classifier, classifier],
  ])
  const components = { get: (cls: unknown) => byClass.get(cls) } as unknown as OBC.Components
  return { components, created }
}

describe('PlanCutFill', () => {
  it('shows one cap however often a plan is reopened', async () => {
    const { components, created } = makeComponents()
    const fill = new PlanCutFill(components)

    await fill.show({} as OBC.World, 3, 0x333333)
    await fill.show({} as OBC.World, 6, 0x333333)

    expect([...created.values()]).toEqual([{ visible: true }])
  })

  it('removes the cap from the styler when hidden', async () => {
    const { components, created } = makeComponents()
    const fill = new PlanCutFill(components)
    await fill.show({} as OBC.World, 3, 0x333333)

    fill.hide()

    expect(created.size).toBe(0)
  })

  it('shows nothing when hidden before the cap finishes building', async () => {
    const { components, created } = makeComponents()
    const fill = new PlanCutFill(components)

    const showing = fill.show({} as OBC.World, 3, 0x333333)
    fill.hide()
    await showing

    expect(created.size).toBe(0)
  })
})
