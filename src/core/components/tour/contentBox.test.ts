// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { contentBox } from './contentBox'

function at(element: Element, left: number, top: number, width: number, height: number) {
  element.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) })
  return element
}

describe('contentBox', () => {
  it('fits the icon of a button wider than it, ignoring a collapsed field', () => {
    const button = at(document.createElement('button'), 0, 0, 40, 36)
    const icon = at(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), 22, 10, 16, 16)
    const collapsed = at(document.createElement('input'), 40, 0, 0, 36)
    button.append(icon, collapsed)
    expect(contentBox(button)).toEqual({ left: 22, top: 10, width: 16, height: 16 })
  })

  it('spans every icon in a row of controls', () => {
    const row = at(document.createElement('div'), 0, 0, 200, 40)
    row.append(
      at(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), 10, 12, 16, 16),
      at(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), 60, 12, 16, 16),
    )
    expect(contentBox(row)).toEqual({ left: 10, top: 12, width: 66, height: 16 })
  })

  it('skips what is laid out but not drawn, like a faded-out label above an icon', () => {
    const group = at(document.createElement('div'), 0, 0, 48, 56)
    const label = document.createElement('div')
    label.style.opacity = '0'
    label.append(at(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), 4, 0, 16, 16))
    group.append(label, at(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), 16, 30, 16, 16))
    expect(contentBox(group)).toEqual({ left: 16, top: 30, width: 16, height: 16 })
  })

  it('keeps to the target, leaving out what spills past its edges', () => {
    const button = at(document.createElement('button'), 0, 0, 40, 40)
    button.append(at(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), 30, 10, 20, 20))
    expect(contentBox(button)).toEqual({ left: 30, top: 10, width: 10, height: 20 })
  })

  it('is null when nothing inside is drawn', () => {
    expect(contentBox(at(document.createElement('div'), 0, 0, 40, 40))).toBeNull()
  })
})
