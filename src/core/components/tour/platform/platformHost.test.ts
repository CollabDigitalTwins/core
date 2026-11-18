// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { findToolTarget, searchFor, setToolOpen, typeInto } from './platformHost'

function toolbarWith(toolId: string, button: HTMLButtonElement) {
  const anchor = document.createElement('div')
  anchor.dataset.tour = `tool-${toolId}`
  anchor.append(button)
  document.body.append(anchor)
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('setToolOpen', () => {
  it('toggles a closed tool open with a press and a click', () => {
    const button = document.createElement('button')
    button.setAttribute('aria-expanded', 'false')
    const pressed = vi.fn()
    const clicked = vi.fn()
    button.addEventListener('pointerdown', pressed)
    button.addEventListener('click', clicked)
    toolbarWith('map-add', button)
    setToolOpen('map-add', true)
    expect(pressed).toHaveBeenCalledOnce()
    expect(clicked).toHaveBeenCalledOnce()
  })

  it('leaves a tool alone when it is already in that state or has no dropdown', () => {
    const open = document.createElement('button')
    open.setAttribute('aria-expanded', 'true')
    const plain = document.createElement('button')
    const clicked = vi.fn()
    open.addEventListener('click', clicked)
    plain.addEventListener('click', clicked)
    toolbarWith('map-add', open)
    toolbarWith('bim-camera-fit', plain)
    setToolOpen('map-add', true)
    setToolOpen('bim-camera-fit', true)
    expect(clicked).not.toHaveBeenCalled()
  })
})

describe('findToolTarget', () => {
  it('points at the panel an open tool controls, and at the tool while it is closed', () => {
    const button = document.createElement('button')
    button.setAttribute('aria-controls', 'compare-card')
    button.setAttribute('aria-expanded', 'false')
    toolbarWith('map-compare', button)
    const card = document.createElement('div')
    card.id = 'compare-card'
    document.body.append(card)
    expect(findToolTarget('map-compare')).toBe(button.parentElement)
    button.setAttribute('aria-expanded', 'true')
    expect(findToolTarget('map-compare')).toBe(card)
  })
})

describe('typeInto', () => {
  it('types one letter at a time, firing input events, then reports done', () => {
    vi.useFakeTimers()
    const input = document.createElement('input')
    const values: string[] = []
    input.addEventListener('input', () => values.push(input.value))
    const onTyped = vi.fn()
    typeInto(input, 'abc', onTyped, 10)
    vi.advanceTimersByTime(30)
    expect(values).toEqual(['a', 'ab', 'abc'])
    expect(onTyped).toHaveBeenCalledOnce()
  })

  it('stops when cancelled', () => {
    vi.useFakeTimers()
    const input = document.createElement('input')
    const onTyped = vi.fn()
    const cancel = typeInto(input, 'abc', onTyped, 10)
    vi.advanceTimersByTime(10)
    cancel()
    vi.advanceTimersByTime(50)
    expect(input.value).toBe('a')
    expect(onTyped).not.toHaveBeenCalled()
  })
})

describe('searchFor', () => {
  it('expands a collapsed search before typing into it', () => {
    vi.useFakeTimers()
    const container = document.createElement('div')
    const expand = document.createElement('button')
    const onExpand = vi.fn()
    expand.addEventListener('click', onExpand)
    const input = document.createElement('input')
    container.append(expand, input)
    const onTyped = vi.fn()
    searchFor(container, 'ab', onTyped)
    expect(onExpand).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(1000)
    expect(input.value).toBe('ab')
    expect(onTyped).toHaveBeenCalledOnce()
  })
})
