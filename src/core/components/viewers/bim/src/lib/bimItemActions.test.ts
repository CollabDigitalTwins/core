// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Stand-ins for the two classes `Components.get()` is keyed by. Only identity
// matters here, so empty classes are enough.
vi.mock('@thatopen/components', () => ({ Hider: class Hider {} }))
vi.mock('../Highlighter', () => ({ Highlighter: class Highlighter {} }))
vi.mock('../VisibilityState', () => ({
  VisibilityState: class VisibilityState {
    listeners = new Set<() => void>()
    onChanged = {
      add: (fn: () => void) => this.listeners.add(fn),
      remove: (fn: () => void) => this.listeners.delete(fn),
    }
    notify() { for (const fn of [...this.listeners]) fn() }
  },
}))

const OBC = await import('@thatopen/components')
const { Highlighter } = await import('../Highlighter')
const { VisibilityState } = await import('../VisibilityState')
const {
  clearHover,
  getHiddenItems,
  getSelectedItems,
  hoverItems,
  isolateItems,
  onVisibilityChanged,
  selectItems,
  setItemsVisible,
  showAllItems,
} = await import('./bimItemActions')

type Components = Parameters<typeof selectItems>[0]

function makeComponents(overrides: {
  highlighter?: unknown
  hider?: unknown
} = {}) {
  const highlighter = overrides.highlighter ?? {
    highlightItems: vi.fn(async () => {}),
    hoverItems: vi.fn(async () => {}),
    clearHover: vi.fn(),
    clearSelection: vi.fn(),
    selectedItems: { arq: new Set([1]) },
  }
  const hider = overrides.hider ?? {
    set: vi.fn(async () => {}),
    isolate: vi.fn(async () => {}),
    getVisibilityMap: vi.fn(async () => ({ arq: [1, 2] })),
  }

  const visibilityState = new VisibilityState({} as never)

  const components = {
    get: (cls: unknown) => {
      if (cls === Highlighter) return highlighter
      if (cls === OBC.Hider) return hider
      if (cls === VisibilityState) return visibilityState
      throw new Error('unknown component')
    },
  } as unknown as Components

  return {
    components,
    highlighter: highlighter as any,
    hider: hider as any,
    visibilityState,
  }
}

describe('selectItems', () => {
  it('routes selection through the viewer highlighter', async () => {
    const { components, highlighter } = makeComponents()
    const items = { arq: new Set([10, 11]) }

    await selectItems(components, items)

    expect(highlighter.highlightItems).toHaveBeenCalledWith(items)
  })

  it('does nothing for an empty map', async () => {
    const { components, highlighter } = makeComponents()

    await selectItems(components, { arq: new Set() })

    expect(highlighter.highlightItems).not.toHaveBeenCalled()
  })
})

describe('hoverItems', () => {
  it('hover-highlights a small set', async () => {
    const { components, highlighter } = makeComponents()
    const items = { arq: new Set([10]) }

    await hoverItems(components, items)

    expect(highlighter.hoverItems).toHaveBeenCalledWith(items)
  })

  it('clears instead of building geometry for a whole branch', async () => {
    const { components, highlighter } = makeComponents()
    const many = { arq: new Set(Array.from({ length: 500 }, (_, i) => i)) }

    await hoverItems(components, many)

    expect(highlighter.hoverItems).not.toHaveBeenCalled()
    expect(highlighter.clearHover).toHaveBeenCalled()
  })
})

describe('visibility', () => {
  let ctx: ReturnType<typeof makeComponents>

  beforeEach(() => { ctx = makeComponents() })

  it('hides and shows the given items across models', async () => {
    const items = { arq: new Set([1]), str: new Set([2]) }

    await setItemsVisible(ctx.components, items, false)
    expect(ctx.hider.set).toHaveBeenCalledWith(false, items)

    await setItemsVisible(ctx.components, items, true)
    expect(ctx.hider.set).toHaveBeenCalledWith(true, items)
  })

  it('isolates through the Hider so other models are hidden too', async () => {
    const items = { arq: new Set([1]) }

    await isolateItems(ctx.components, items)

    expect(ctx.hider.isolate).toHaveBeenCalledWith(items)
  })

  it('shows everything with no map, which resets an isolate', async () => {
    await showAllItems(ctx.components)

    expect(ctx.hider.set).toHaveBeenCalledWith(true)
  })

  it('skips the Hider entirely for an empty map', async () => {
    await setItemsVisible(ctx.components, {}, false)
    await isolateItems(ctx.components, {})

    expect(ctx.hider.set).not.toHaveBeenCalled()
    expect(ctx.hider.isolate).not.toHaveBeenCalled()
  })
})

describe('onVisibilityChanged', () => {
  it('fires for every action that changes visibility', async () => {
    const { components } = makeComponents()
    const listener = vi.fn()
    onVisibilityChanged(components, listener)

    await setItemsVisible(components, { arq: new Set([1]) }, false)
    expect(listener).toHaveBeenCalledTimes(1)

    await isolateItems(components, { arq: new Set([1]) })
    expect(listener).toHaveBeenCalledTimes(2)

    await showAllItems(components)
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('does not fire when an empty map short-circuits the action', async () => {
    const { components } = makeComponents()
    const listener = vi.fn()
    onVisibilityChanged(components, listener)

    await setItemsVisible(components, {}, false)
    await isolateItems(components, {})

    expect(listener).not.toHaveBeenCalled()
  })

  it('stops firing once unsubscribed', async () => {
    const { components } = makeComponents()
    const listener = vi.fn()
    const unsubscribe = onVisibilityChanged(components, listener)

    unsubscribe()
    await showAllItems(components)

    expect(listener).not.toHaveBeenCalled()
  })

  it('returns a safe no-op when there is no viewer', () => {
    const components = {
      get: () => { throw new Error('not registered') },
    } as unknown as Components

    expect(() => onVisibilityChanged(components, vi.fn())()).not.toThrow()
  })
})

describe('getHiddenItems', () => {
  it('converts the Hider arrays into sets', async () => {
    const { components } = makeComponents()

    const hidden = await getHiddenItems(components)

    expect(hidden.arq).toBeInstanceOf(Set)
    expect([...hidden.arq]).toEqual([1, 2])
  })

  it('degrades to an empty map when the Hider throws', async () => {
    const { components } = makeComponents({
      hider: { getVisibilityMap: vi.fn(async () => { throw new Error('no models') }) },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(await getHiddenItems(components)).toEqual({})

    warn.mockRestore()
  })
})

describe('component lookup failures', () => {
  it('no-ops when neither component is registered', async () => {
    const components = {
      get: () => { throw new Error('not registered') },
    } as unknown as Components

    await expect(selectItems(components, { arq: new Set([1]) })).resolves.toBeUndefined()
    await expect(showAllItems(components)).resolves.toBeUndefined()
    expect(await getHiddenItems(components)).toEqual({})
    expect(getSelectedItems(components)).toEqual({})
    expect(() => clearHover(components)).not.toThrow()
  })
})
