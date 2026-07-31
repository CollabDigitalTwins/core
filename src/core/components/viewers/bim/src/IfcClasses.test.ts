// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

vi.mock('@thatopen/components', () => {
  class Event<T> {
    handlers = new Set<(arg: T) => void>()
    add(handler: (arg: T) => void) { this.handlers.add(handler) }
    remove(handler: (arg: T) => void) { this.handlers.delete(handler) }
    trigger(arg: T) { for (const handler of [...this.handlers]) handler(arg) }
    reset() { this.handlers.clear() }
  }
  class Component {
    constructor(public components: any) {}
  }
  class FragmentsManager {}
  class Classifier {}
  return { Component, Event, FragmentsManager, Classifier }
})

const OBC = await import('@thatopen/components')
const { IfcClasses, IFC_CLASS_CLASSIFICATION } = await import('./IfcClasses')

/** A group whose `get()` resolves the same way the real query-backed groups do. */
function group(items: Record<string, number[]>) {
  return { map: {}, get: vi.fn(async () => {
    const result: Record<string, Set<number>> = {}
    for (const modelId of Object.keys(items)) result[modelId] = new Set(items[modelId])
    return result
  }) }
}

function makeComponents(options: {
  models?: string[]
  groups?: Map<string, ReturnType<typeof group>>
  byCategory?: () => Promise<void>
} = {}) {
  const modelIds = options.models ?? ['arq']
  const fragments = {
    list: {
      size: modelIds.length,
      onItemSet: new OBC.Event<unknown>(),
      onItemDeleted: new OBC.Event<unknown>(),
    },
  }
  const classifier = {
    list: new Map([[IFC_CLASS_CLASSIFICATION, options.groups ?? new Map()]]),
    byCategory: vi.fn(options.byCategory ?? (async () => {})),
  }

  const components = {
    add: vi.fn(),
    get: (cls: unknown) => {
      if (cls === OBC.FragmentsManager) return fragments
      if (cls === OBC.Classifier) return classifier
      throw new Error('unknown component')
    },
  }

  return { components: components as any, fragments, classifier }
}

describe('IfcClasses', () => {
  it('builds one node per IFC class, sorted, with names kept verbatim', async () => {
    const groups = new Map([
      ['IFCWALL', group({ arq: [1, 2, 3] })],
      ['IFCDOOR', group({ arq: [7] })],
      ['IFCSLAB', group({ arq: [4, 5] })],
    ])
    const { components } = makeComponents({ groups })
    const ifcClasses = new IfcClasses(components)

    const classes = await ifcClasses.refresh()

    expect(classes.map(node => node.label)).toEqual(['IFCDOOR', 'IFCSLAB', 'IFCWALL'])
    expect(classes.map(node => node.id)).toEqual([
      'ifc-class:IFCDOOR', 'ifc-class:IFCSLAB', 'ifc-class:IFCWALL',
    ])
    expect(classes.every(node => node.children.length === 0)).toBe(true)
  })

  it('carries each class\'s items so hide and isolate can act on them', async () => {
    const groups = new Map([['IFCWALL', group({ arq: [1, 2], str: [9] })]])
    const { components } = makeComponents({ groups })

    const [walls] = await new IfcClasses(components).refresh()

    expect([...walls.items.arq]).toEqual([1, 2])
    expect([...walls.items.str]).toEqual([9])
  })

  it('classifies under the Categories classification', async () => {
    const { components, classifier } = makeComponents()

    await new IfcClasses(components).refresh()

    expect(classifier.byCategory).toHaveBeenCalledWith({
      classificationName: IFC_CLASS_CLASSIFICATION,
    })
  })

  it('drops classes that resolve to nothing', async () => {
    const groups = new Map([
      ['IFCWALL', group({ arq: [1] })],
      ['IFCFURNITURE', group({ arq: [] })],
    ])
    const { components } = makeComponents({ groups })

    const classes = await new IfcClasses(components).refresh()

    expect(classes.map(node => node.label)).toEqual(['IFCWALL'])
  })

  it('survives a single class failing to resolve', async () => {
    const failing = { map: {}, get: vi.fn(async () => { throw new Error('query failed') }) }
    const groups = new Map<string, any>([
      ['IFCWALL', group({ arq: [1] })],
      ['IFCBROKEN', failing],
    ])
    const { components } = makeComponents({ groups })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const classes = await new IfcClasses(components).refresh()

    expect(classes.map(node => node.label)).toEqual(['IFCWALL'])
    warn.mockRestore()
  })

  it('reports nothing when no model is loaded', async () => {
    const { components, classifier } = makeComponents({ models: [] })

    expect(await new IfcClasses(components).refresh()).toEqual([])
    expect(classifier.byCategory).not.toHaveBeenCalled()
  })

  it('announces the result and the loading state', async () => {
    const groups = new Map([['IFCWALL', group({ arq: [1] })]])
    const { components } = makeComponents({ groups })
    const ifcClasses = new IfcClasses(components)

    const seen: string[] = []
    ifcClasses.onLoadingStateChanged.add(({ isLoading }) => seen.push(`loading:${isLoading}`))
    ifcClasses.onClassesChanged.add(({ classes }) => seen.push(`classes:${classes.length}`))

    await ifcClasses.refresh()

    expect(seen).toEqual(['loading:true', 'classes:1', 'loading:false'])
  })

  it('shares one pass between overlapping refreshes', async () => {
    const groups = new Map([['IFCWALL', group({ arq: [1] })]])
    const { components, classifier } = makeComponents({ groups })
    const ifcClasses = new IfcClasses(components)

    await Promise.all([ifcClasses.refresh(), ifcClasses.refresh(), ifcClasses.refresh()])

    // One shared pass, plus a single re-run because models may have changed
    // while it was in flight.
    expect(classifier.byCategory.mock.calls.length).toBeLessThanOrEqual(2)
    expect(ifcClasses.classes).toHaveLength(1)
  })

  it('degrades to an empty list when classification throws', async () => {
    const { components } = makeComponents({
      byCategory: async () => { throw new Error('worker gone') },
    })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await new IfcClasses(components).refresh()).toEqual([])

    error.mockRestore()
  })

  it('unsubscribes from model events on dispose', async () => {
    const { components, fragments } = makeComponents()
    // `handlers` is public on the stub above but private on the real OBC.Event.
    const subscriberCount = (event: unknown) =>
      (event as { handlers: Set<unknown> }).handlers.size

    const ifcClasses = new IfcClasses(components)

    expect(subscriberCount(fragments.list.onItemSet)).toBe(1)
    expect(subscriberCount(fragments.list.onItemDeleted)).toBe(1)

    ifcClasses.dispose()

    expect(subscriberCount(fragments.list.onItemSet)).toBe(0)
    expect(subscriberCount(fragments.list.onItemDeleted)).toBe(0)
  })
})
