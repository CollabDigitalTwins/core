// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { findSidebarPageLink, setToolbarPanel } from './hostTargets'

const element = {} as Element

function toolbar(expanded: boolean) {
  const click = vi.fn()
  const toggle = (controls: string, onClick = vi.fn()) => ({
    getAttribute: (name: string) => (name === 'aria-controls' ? controls : String(expanded)),
    click: onClick,
  })
  const lookup = {
    querySelectorAll: () => [toggle('other'), toggle('tool-panel', click)],
    getElementById: (id: string) => ({ contains: (e: Element) => id === 'tool-panel' && e === element }),
  } as unknown as Pick<Document, 'querySelectorAll' | 'getElementById'>
  return { click, lookup }
}

describe('setToolbarPanel', () => {
  it('opens a closed dropdown through its toggle', () => {
    const { click, lookup } = toolbar(false)
    setToolbarPanel(element, true, lookup)
    expect(click).toHaveBeenCalledOnce()
  })

  it('closes an open dropdown through its toggle', () => {
    const { click, lookup } = toolbar(true)
    setToolbarPanel(element, false, lookup)
    expect(click).toHaveBeenCalledOnce()
  })

  it('leaves a dropdown that is already as asked', () => {
    const { click, lookup } = toolbar(true)
    setToolbarPanel(element, true, lookup)
    expect(click).not.toHaveBeenCalled()
  })

  it('does nothing without an element', () => {
    const { click, lookup } = toolbar(false)
    setToolbarPanel(null, true, lookup)
    expect(click).not.toHaveBeenCalled()
  })
})

const button = (textContent: string) => ({ textContent }) as HTMLElement
const sidebar = (...buttons: HTMLElement[]) => ({ querySelectorAll: () => buttons }) as unknown as Pick<Document, 'querySelectorAll'>

describe('findSidebarPageLink', () => {
  it('finds the sidebar button whose title matches', () => {
    const report = button('  Cultural access report ')
    expect(findSidebarPageLink('Cultural access report', sidebar(button('Map'), report))).toBe(report)
  })

  it('returns null when the page is not in the sidebar', () => {
    expect(findSidebarPageLink('Cultural access report', sidebar(button('Map')))).toBeNull()
  })
})
