// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { shouldIgnoreEscape } from './escapeGuard'

function escapeFrom(target: EventTarget, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...init })
  let ignored: boolean | undefined
  target.addEventListener('keydown', e => { ignored = shouldIgnoreEscape(e as KeyboardEvent) }, { once: true })
  target.dispatchEvent(event)
  return ignored
}

describe('shouldIgnoreEscape', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('is false for a plain Escape on the body', () => {
    expect(escapeFrom(document.body)).toBe(false)
  })

  it('is true once the event is default-prevented', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    event.preventDefault()
    expect(shouldIgnoreEscape(event)).toBe(true)
  })

  it.each(['input', 'textarea', 'select'])('is true when the target is a %s', tag => {
    const el = document.body.appendChild(document.createElement(tag))
    expect(escapeFrom(el)).toBe(true)
  })

  it('is true when the target is contenteditable', () => {
    const el = document.body.appendChild(document.createElement('div'))
    Object.defineProperty(el, 'isContentEditable', { value: true })
    expect(escapeFrom(el)).toBe(true)
  })

  it.each(['dialog', 'menu'])('is true while a [role=%s] is open', role => {
    document.body.appendChild(document.createElement('div')).setAttribute('role', role)
    expect(escapeFrom(document.body)).toBe(true)
  })
})
