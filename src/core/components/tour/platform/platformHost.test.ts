// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { afterMenusClose, demoSwitch, demoTabs, findToolTarget, focusTourCard, openSection, searchFor, setToolOpen, typeInto } from './platformHost'

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

describe('focusTourCard', () => {
  it('moves focus from the page back to the tour card', () => {
    document.body.innerHTML = '<input id="page" /><div class="cdt-tour-card"><button class="cdt-tour-next">Next</button></div>'
    document.querySelector<HTMLInputElement>('#page')?.focus()
    focusTourCard()
    expect(document.activeElement).toHaveTextContent('Next')
  })
})

describe('afterMenusClose', () => {
  it('waits for an open menu to close before acting', () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div role="menu"></div>'
    const action = vi.fn()
    afterMenusClose(action)
    vi.advanceTimersByTime(50)
    expect(action).not.toHaveBeenCalled()
    document.body.innerHTML = ''
    vi.advanceTimersByTime(50)
    expect(action).toHaveBeenCalledOnce()
  })
})

describe('openSection', () => {
  it('expands a collapsed section and leaves an open one alone', () => {
    document.body.innerHTML = '<div data-tour="a"><div aria-expanded="false"></div></div><div data-tour="b"><div aria-expanded="true"></div></div>'
    const clicks = [...document.querySelectorAll<HTMLElement>('[aria-expanded]')].map(header => {
      const onClick = vi.fn()
      header.addEventListener('click', onClick)
      return onClick
    })
    openSection('a')
    openSection('b')
    expect(clicks.map(onClick => onClick.mock.calls.length)).toEqual([1, 0])
  })
})

describe('demoTabs', () => {
  it('switches to another enabled tab after a beat and back when the step closes', () => {
    vi.useFakeTimers()
    document.body.innerHTML = `<div data-tour="g">
      <button role="tab" data-state="active" id="one"></button>
      <button role="tab" data-state="inactive" disabled id="two"></button>
      <button role="tab" data-state="inactive" id="three"></button></div>`
    const pressed: string[] = []
    document.querySelectorAll('[role="tab"]').forEach(tab => tab.addEventListener('click', () => {
      pressed.push(tab.id)
      document.querySelectorAll<HTMLElement>('[role="tab"]').forEach(other => { other.dataset.state = other === tab ? 'active' : 'inactive' })
    }))
    const undo = demoTabs('g')
    vi.advanceTimersByTime(1000)
    undo()
    expect(pressed).toEqual(['three', 'one'])
  })
})

describe('demoSwitch', () => {
  it('flips the switch after a beat and back when the step closes, but not if the step closed first', () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div data-tour="s"><button role="switch"></button></div>'
    const onClick = vi.fn()
    document.querySelector('[role="switch"]')?.addEventListener('click', onClick)
    demoSwitch('s')()
    const undo = demoSwitch('s')
    vi.advanceTimersByTime(1000)
    undo()
    expect(onClick).toHaveBeenCalledTimes(2)
  })
})
