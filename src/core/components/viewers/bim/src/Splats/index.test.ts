// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

vi.mock('@thatopen/components', () => {
  class Event<T> {
    trigger(_arg?: T) {}
  }
  class Component { constructor(public components: unknown) {} }
  return { Component, Event }
})

import { BimSplats } from './index'

// Only the appearance bookkeeping is under test; nothing here touches Spark or WebGL.
const splats = () => {
  const component = Object.create(BimSplats.prototype) as BimSplats
  Object.assign(component, {
    appearances: new Map(),
    highlights: new Map(),
    onAppearanceChanged: { trigger: vi.fn() },
    get: () => undefined,
    refresh: () => {},
  })
  return component
}

describe('BimSplats.setHighlight', () => {
  it('reports the user tint, not the highlight, while highlighted', () => {
    const component = splats()
    component.setAppearance('7', { recolor: '#ff0000' })

    component.setHighlight('7', 'selected')

    expect(component.appearanceOf('7').recolor).toBe('#ff0000')
    expect(component.highlightOf('7')).toBe('selected')
  })

  it('restores the user tint when the highlight clears', () => {
    const component = splats()
    component.setAppearance('7', { recolor: '#ff0000' })

    component.setHighlight('7', 'hover')
    component.setHighlight('7', 'none')

    expect(component.appearanceOf('7').recolor).toBe('#ff0000')
    expect(component.highlightOf('7')).toBe('none')
  })

  it('keeps a tint the user changes mid-highlight', () => {
    const component = splats()
    component.setHighlight('7', 'selected')

    component.setAppearance('7', { recolor: '#00ff00' })
    component.setHighlight('7', 'none')

    expect(component.appearanceOf('7').recolor).toBe('#00ff00')
  })

  it('leaves opacity alone, so a ghosted splat stays ghosted', () => {
    const component = splats()
    component.setGhosted('7', true)

    component.setHighlight('7', 'selected')

    expect(component.isGhosted('7')).toBe(true)
  })

  it('forgets a highlight when the world tears down, so a reused id starts clean', () => {
    const component = splats()
    Object.assign(component, {
      frameHandle: 0,
      onChanged: { reset: () => {} },
      onSettingsChanged: { reset: () => {} },
      onDisposed: { trigger: () => {}, reset: () => {} },
    })
    component.onAppearanceChanged.reset = () => {}
    component.setHighlight('7', 'selected')

    component.dispose()

    expect(component.highlightOf('7')).toBe('none')
  })
})
