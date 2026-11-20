// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { afterMenusClose, DEMO_DELAY_MS, demoSwitch, demoTabs, expandIfCollapsed, findToolTarget, focusTourCard, onClosed, openSection, openToolPanel, pickSuggestion, pressWhenShown, schedule, searchFor, setToolOpen, typeInto, waitFor } from './platformHost'

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

describe('pickSuggestion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  })
  afterEach(() => vi.unstubAllGlobals())

  function searchBox() {
    const container = document.createElement('div')
    container.append(document.createElement('input'))
    const item = document.createElement('div')
    item.setAttribute('cmdk-item', '')
    item.textContent = 'Carleton University, Ottawa'
    const clicked = vi.fn()
    item.addEventListener('click', clicked)
    return { container, item, clicked }
  }

  it('picks Carleton University from the search results', () => {
    const { container, item, clicked } = searchBox()
    const picked = vi.fn()
    const flyTo = vi.fn()
    pickSuggestion(container, 'Carleton University', picked, flyTo)
    setTimeout(() => container.append(item), 48)
    vi.advanceTimersByTime(48 + 16)
    expect(clicked).not.toHaveBeenCalled()
    vi.advanceTimersByTime(DEMO_DELAY_MS + 16)
    expect(clicked).toHaveBeenCalledOnce()
    expect(picked).toHaveBeenCalledOnce()
    expect(flyTo).not.toHaveBeenCalled()
  })

  it('flies to Carleton when no result appears', () => {
    const { container } = searchBox()
    const picked = vi.fn()
    const flyTo = vi.fn()
    pickSuggestion(container, 'Carleton University', picked, flyTo)
    vi.advanceTimersByTime(60_000)
    expect(flyTo).toHaveBeenCalledOnce()
    expect(picked).not.toHaveBeenCalled()
  })

  it('stops waiting and clicking when cancelled', () => {
    const { container, item, clicked } = searchBox()
    container.append(item)
    const cancel = pickSuggestion(container, 'Carleton University', vi.fn(), vi.fn())
    cancel()
    vi.advanceTimersByTime(DEMO_DELAY_MS + 100)
    expect(clicked).not.toHaveBeenCalled()
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

describe('pressWhenShown', () => {
  it('focuses a search box instead of clicking it', () => {
    document.body.innerHTML = '<div data-tour="find"><input aria-label="find" /></div>'
    pressWhenShown('find')
    expect(document.activeElement).toBe(document.querySelector('input'))
  })
})

describe('waitFor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('waits for a condition before acting', () => {
    let calls = 0
    const then = vi.fn()
    waitFor(() => ++calls > 3, then)
    vi.advanceTimersByTime(16 * 2)
    expect(then).not.toHaveBeenCalled()
    vi.advanceTimersByTime(16 * 10)
    expect(then).toHaveBeenCalledTimes(1)
  })

  it('gives up after the frame budget', () => {
    const then = vi.fn()
    const giveUp = vi.fn()
    waitFor(() => false, then, 5, giveUp)
    vi.advanceTimersByTime(16 * 20)
    expect(then).not.toHaveBeenCalled()
    expect(giveUp).toHaveBeenCalledOnce()
  })
})

describe('schedule', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('calls a wait\'s give-up when the condition never comes, unless the schedule stopped', () => {
    let stopped = false
    const giveUp = vi.fn()
    const s = schedule(() => stopped)
    s.when(() => false, vi.fn(), giveUp)
    vi.advanceTimersByTime(16 * 700)
    expect(giveUp).toHaveBeenCalledOnce()
    stopped = true
    s.when(() => false, vi.fn(), giveUp)
    vi.advanceTimersByTime(16 * 700)
    expect(giveUp).toHaveBeenCalledOnce()
  })
})

describe('expandIfCollapsed', () => {
  it('presses a collapsed toggle and leaves an expanded one alone', () => {
    document.body.innerHTML = '<button id="closed" aria-expanded="false"></button><button id="open" aria-expanded="true"></button>'
    const clicked = vi.fn()
    document.addEventListener('click', clicked)
    expandIfCollapsed(document.querySelector<HTMLElement>('#closed'))
    expandIfCollapsed(document.querySelector<HTMLElement>('#open'))
    expandIfCollapsed(null)
    document.removeEventListener('click', clicked)
    expect(clicked).toHaveBeenCalledOnce()
  })
})

describe('onClosed', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  })

  afterEach(() => vi.unstubAllGlobals())

  const card = () => document.querySelector('#card')

  it('calls back once a seen element goes away', () => {
    document.body.innerHTML = '<div id="card"></div>'
    const closed = vi.fn()
    onClosed(card, closed)
    vi.advanceTimersByTime(16 * 3)
    expect(closed).not.toHaveBeenCalled()
    card()?.remove()
    vi.advanceTimersByTime(16 * 20)
    expect(closed).toHaveBeenCalledOnce()
  })

  it('does not fire before the element first appears', () => {
    const closed = vi.fn()
    onClosed(card, closed)
    vi.advanceTimersByTime(16 * 20)
    expect(closed).not.toHaveBeenCalled()
    document.body.innerHTML = '<div id="card"></div>'
    vi.advanceTimersByTime(16 * 5)
    expect(closed).not.toHaveBeenCalled()
  })

  it('ignores a flicker shorter than a few frames', () => {
    document.body.innerHTML = '<div id="card"></div>'
    const closed = vi.fn()
    onClosed(card, closed)
    vi.advanceTimersByTime(16)
    const gone = card()!
    gone.remove()
    vi.advanceTimersByTime(16)
    document.body.append(gone)
    vi.advanceTimersByTime(16 * 20)
    expect(closed).not.toHaveBeenCalled()
  })

  it('stops when cancelled', () => {
    document.body.innerHTML = '<div id="card"></div>'
    const closed = vi.fn()
    const cancel = onClosed(card, closed)
    vi.advanceTimersByTime(16 * 2)
    cancel()
    card()?.remove()
    vi.advanceTimersByTime(16 * 20)
    expect(closed).not.toHaveBeenCalled()
  })
})

describe('openToolPanel', () => {
  it('returns a tool card only while its button is expanded', () => {
    const button = document.createElement('button')
    button.setAttribute('aria-expanded', 'false')
    button.setAttribute('aria-controls', 'panel')
    toolbarWith('map-measure', button)
    document.body.insertAdjacentHTML('beforeend', '<div id="panel"></div>')
    expect(openToolPanel('map-measure')).toBeNull()
    button.setAttribute('aria-expanded', 'true')
    expect(openToolPanel('map-measure')?.id).toBe('panel')
    expect(openToolPanel('map-add')).toBeNull()
  })
})
