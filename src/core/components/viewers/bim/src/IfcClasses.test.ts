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
  class Hider {
    set = vi.fn(async () => {})
    isolate = vi.fn(async () => {})
    getVisibilityMap = vi.fn(async () => ({}))
  }
  return { Component, Event, FragmentsManager, Classifier, Hider }
})
vi.mock('./Highlighter', () => ({ Highlighter: class Highlighter {} }))

const OBC = await import('@thatopen/components')
const { VisibilityState } = await import('./VisibilityState')
const { IfcClasses, IFC_CLASS_CLASSIFICATION, DEFAULT_HIDDEN_IFC_CLASSES } =
  await import('./IfcClasses')

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

  // The stub above takes no constructor args, unlike the real class it replaces.
  const hider = new OBC.Hider({} as never)
  let visibilityState: InstanceType<typeof VisibilityState> | null = null

  const components: any = {
    add: vi.fn(),
    get: (cls: unknown) => {
      if (cls === OBC.FragmentsManager) return fragments
      if (cls === OBC.Classifier) return classifier
      if (cls === OBC.Hider) return hider
      if (cls === VisibilityState) {
        visibilityState ??= new VisibilityState(components)
        return visibilityState
      }
      throw new Error('unknown component')
    },
  }

  return {
    components,
    fragments,
    classifier,
    hider: hider as any,
    getVisibilityState: () => components.get(VisibilityState),
  }
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

  describe('default-hidden classes', () => {
    it('covers topography in both schemas, plus spaces', () => {
      expect([...DEFAULT_HIDDEN_IFC_CLASSES]).toEqual([
        'IFCGEOGRAPHICELEMENT', 'IFCSITE', 'IFCSPACE',
      ])
    })

    it('leaves IFCBUILDINGELEMENTPROXY alone, since it is the generic catch-all', () => {
      expect(DEFAULT_HIDDEN_IFC_CLASSES).not.toContain('IFCBUILDINGELEMENTPROXY')
    })

    it('hides them on first load but leaves everything else visible', async () => {
      const groups = new Map([
        ['IFCWALL', group({ arq: [1, 2] })],
        ['IFCBUILDINGELEMENTPROXY', group({ arq: [5] })],
        ['IFCGEOGRAPHICELEMENT', group({ arq: [9] })],
        ['IFCSITE', group({ arq: [10] })],
        ['IFCSPACE', group({ arq: [20, 21] })],
      ])
      const { components, hider } = makeComponents({ groups })

      await new IfcClasses(components).refresh()

      expect(hider.set).toHaveBeenCalledTimes(1)
      const [visible, items] = hider.set.mock.calls[0]
      expect(visible).toBe(false)
      expect([...items.arq].sort((a: number, b: number) => a - b)).toEqual([9, 10, 20, 21])
    })

    it('still lists them, so they can be switched back on', async () => {
      const groups = new Map([['IFCSPACE', group({ arq: [20] })]])
      const { components } = makeComponents({ groups })

      const classes = await new IfcClasses(components).refresh()

      expect(classes.map(node => node.label)).toEqual(['IFCSPACE'])
    })

    it('does not re-hide a class the user has turned back on', async () => {
      const groups = new Map([['IFCSPACE', group({ arq: [20] })]])
      const { components, hider } = makeComponents({ groups })
      const ifcClasses = new IfcClasses(components)

      await ifcClasses.refresh()
      hider.set.mockClear()
      // A later rebuild (another model, a re-open) must not undo the user's choice.
      await ifcClasses.refresh()

      expect(hider.set).not.toHaveBeenCalled()
    })

    it('applies the default to each model separately', async () => {
      const groups = new Map([['IFCSPACE', group({ arq: [20] })]])
      const { components, hider } = makeComponents({ groups })
      const ifcClasses = new IfcClasses(components)

      await ifcClasses.refresh()
      hider.set.mockClear()

      // A second model shows up with spaces of its own.
      groups.set('IFCSPACE', group({ arq: [20], str: [77] }))
      await ifcClasses.refresh()

      expect(hider.set).toHaveBeenCalledTimes(1)
      const [, items] = hider.set.mock.calls[0]
      expect(items).toEqual({ str: new Set([77]) })
    })

    it('does nothing when the model has none of them', async () => {
      const groups = new Map([['IFCWALL', group({ arq: [1] })]])
      const { components, hider } = makeComponents({ groups })

      await new IfcClasses(components).refresh()

      expect(hider.set).not.toHaveBeenCalled()
    })

    it('announces the change so the other panels re-read visibility', async () => {
      const groups = new Map([['IFCSITE', group({ arq: [10] })]])
      const ctx = makeComponents({ groups })
      const listener = vi.fn()
      ctx.getVisibilityState().onChanged.add(listener)

      await new IfcClasses(ctx.components).refresh()

      expect(listener).toHaveBeenCalled()
    })
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
