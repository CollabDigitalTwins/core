// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCommentDemo, createSensorDemo, placedTarget } from './placeDemo'
import { DEMO_DELAY_MS } from './platformHost'

import type { PlacedItem, PlaceStage, SensorPort } from './placeDemo'

const FRAME = 16
const TYPING_MS = 70
const TEXT = 'Tour demo comment'
const NAME = 'Tour demo sensor'

type Kind = 'comment' | 'sensor'

const anchored = <T extends HTMLElement = HTMLElement>(name: string) => document.querySelector<T>(`[data-tour="${name}"]`)

const DIALOGS: Record<Kind, string> = {
  comment: '<div data-tour="comment-input"><input data-tour="comment-input-text" value="" /><button data-tour="comment-submit" disabled></button></div>',
  sensor: '<div data-tour="sensor-input"><input data-tour="sensor-input-name" value="" /><input data-tour="sensor-input-url" value="" /><button data-tour="sensor-place" disabled></button></div>',
}

function fakeApp(kind: Kind, seed: PlacedItem[] = [], { arrivalFrames = 0, typeIds = [4] } = {}) {
  let items = seed
  let placing = false
  let nextId = 100
  const blurred: string[] = []
  const committed: Record<string, string> = {}
  const list = () => anchored(kind === 'comment' ? 'panel-comments' : 'panel-sensors')!

  const renderRow = (item: PlacedItem) => {
    const row = document.createElement('div')
    row.dataset.tour = `${kind}-item:${item.id}`
    const remove = document.createElement('button')
    remove.dataset.tour = 'item-delete'
    remove.addEventListener('click', () => port.remove(item.id))
    row.append(remove)
    list().append(row)
  }

  const openDialog = () => {
    if (anchored(`${kind}-input`)) return
    document.body.insertAdjacentHTML('beforeend', DIALOGS[kind])
    const dialog = anchored(`${kind}-input`)!
    const inputs = [...dialog.querySelectorAll('input')]
    const button = dialog.querySelector('button')!
    const sync = () => { button.disabled = inputs.some(input => !input.value) }
    inputs.forEach(input => {
      input.addEventListener('input', sync)
      input.addEventListener('focusout', () => {
        blurred.push(input.dataset.tour ?? '')
        committed[input.dataset.tour ?? ''] = input.value
      })
    })
    button.addEventListener('click', () => {
      if (button.disabled) return
      placing = true
      label = inputs[0].value
      dialog.remove()
    })
  }

  let label = ''
  const port = {
    items: () => items,
    remove: vi.fn((id: number) => {
      items = items.filter(item => item.id !== id)
      anchored(`${kind}-item:${id}`)?.remove()
    }),
    openDialog: vi.fn(openDialog),
    closeDialog: vi.fn(() => {
      placing = false
      anchored(`${kind}-input`)?.remove()
    }),
    placeAtCentre: vi.fn(() => {
      if (!placing) return
      placing = false
      const item = { id: nextId++, label }
      setTimeout(() => {
        items = [...items, item]
        renderRow(item)
      }, arrivalFrames * FRAME)
    }),
    typeIds: () => typeIds,
    preselectType: vi.fn(),
  } satisfies SensorPort

  document.body.innerHTML = kind === 'comment'
    ? '<div data-tour="panel-comments"><button data-tour="section-add"></button></div>'
    : '<div data-tour="panel-sensors"></div>'
  anchored('section-add')?.addEventListener('click', openDialog)
  seed.forEach(renderRow)
  return { port, blurred, committed, placing: () => placing }
}

const demoFor = (kind: Kind, port: SensorPort) => (kind === 'comment' ? createCommentDemo(port) : createSensorDemo(port))

const LABEL: Record<Kind, string> = { comment: TEXT, sensor: NAME }

const typed = (label: string) => vi.advanceTimersByTime(label.length * TYPING_MS + DEMO_DELAY_MS + FRAME * 2)

const placed = () => vi.advanceTimersByTime(DEMO_DELAY_MS + FRAME * 4)

function walk(demo: (stage: PlaceStage, label: string) => () => void, label: string, stages: PlaceStage[]) {
  let close = () => {}
  for (const stage of stages) {
    const next = demo(stage, label)
    close()
    close = next
    if (stage === 'add') typed(label)
    else placed()
  }
  return close
}

const leave = (close: () => void) => {
  close()
  vi.advanceTimersByTime(FRAME)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), FRAME))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe.each(['comment', 'sensor'] as const)('the %s demo', kind => {
  const label = LABEL[kind]

  it('writes the demo text and presses the dialog\'s submit, which starts placing', () => {
    const { port, placing } = fakeApp(kind)
    const close = walk(demoFor(kind, port), label, ['add'])
    expect(placing()).toBe(true)
    expect(anchored(`${kind}-input`)).toBeNull()
    leave(close)
  })

  it('places it at the map centre and spotlights its row', () => {
    const { port } = fakeApp(kind)
    const close = walk(demoFor(kind, port), label, ['add', 'place'])
    expect(port.placeAtCentre).toHaveBeenCalledOnce()
    expect(placedTarget(kind)()).not.toBeNull()
    expect(placedTarget(kind)()).toBe(anchored(`${kind}-item:100`))
    leave(close)
  })

  it('deletes its own item with the row\'s delete button and nothing else', () => {
    const { port } = fakeApp(kind, [{ id: 1, label: 'Someone else' }])
    const close = walk(demoFor(kind, port), label, ['add', 'place', 'delete'])
    expect(port.remove.mock.calls).toEqual([[100]])
    leave(close)
    expect(port.items().map(item => item.id)).toEqual([1])
    expect(port.remove).toHaveBeenCalledOnce()
  })

  it('deletes what it placed when the person leaves before the delete step', () => {
    const { port } = fakeApp(kind)
    const close = walk(demoFor(kind, port), label, ['add', 'place'])
    expect(port.remove).not.toHaveBeenCalled()
    leave(close)
    expect(port.remove).toHaveBeenCalledWith(100)
    expect(port.items()).toEqual([])
  })

  it('deletes an item that lands after the demo was released', () => {
    const { port } = fakeApp(kind, [], { arrivalFrames: 20 })
    const close = walk(demoFor(kind, port), label, ['add', 'place'])
    expect(port.items()).toEqual([])
    leave(close)
    vi.advanceTimersByTime(FRAME * 30)
    expect(port.items()).toEqual([])
    expect(port.remove).toHaveBeenCalledWith(100)
  })

  it('never deletes an item that was there before with the same text', () => {
    const { port } = fakeApp(kind, [{ id: 1, label }])
    leave(walk(demoFor(kind, port), label, ['add', 'place', 'delete']))
    expect(port.items().map(item => item.id)).toEqual([1])
    expect(port.remove).not.toHaveBeenCalledWith(1)
  })

  it('cancels placing when the person leaves before it is placed', () => {
    const { port, placing } = fakeApp(kind)
    leave(walk(demoFor(kind, port), label, ['add']))
    expect(port.closeDialog).toHaveBeenCalled()
    expect(placing()).toBe(false)
    expect(port.placeAtCentre).not.toHaveBeenCalled()
  })

  it('still places the full text when the person moves on before typing finished', () => {
    const { port } = fakeApp(kind)
    const demo = demoFor(kind, port)
    const closeAdd = demo('add', label)
    vi.advanceTimersByTime(TYPING_MS * 3)
    const close = demo('place', label)
    closeAdd()
    placed()
    placed()
    expect(port.items()).toEqual([{ id: 100, label }])
    leave(close)
  })
})

describe('the comment demo', () => {
  it('opens the dialog with the Comments section\'s + and closes the dialog that reopens after placing', () => {
    const { port } = fakeApp('comment')
    const close = walk(createCommentDemo(port), TEXT, ['add', 'place'])
    expect(port.openDialog).not.toHaveBeenCalled()
    expect(port.closeDialog).toHaveBeenCalledOnce()
    leave(close)
    expect(port.closeDialog).toHaveBeenCalledOnce()
  })
})

describe('the sensor demo', () => {
  function withTypeGroup(id: number, onAdd: () => void) {
    const group = document.createElement('div')
    group.dataset.tour = `sensor-type:${id}`
    group.innerHTML = '<div role="button" aria-expanded="false"></div><button data-tour="section-add"></button>'
    group.querySelector('[data-tour="section-add"]')!.addEventListener('click', onAdd)
    anchored('panel-sensors')!.append(group)
    return group
  }

  it('fills the data URL and leaves the field so the preview runs', () => {
    const { port, blurred, committed } = fakeApp('sensor')
    const close = walk(createSensorDemo(port), NAME, ['add'])
    expect(port.openDialog).toHaveBeenCalledOnce()
    expect(port.preselectType).toHaveBeenCalledWith(4)
    expect(blurred).toContain('sensor-input-url')
    expect(committed['sensor-input-url']).toMatch(/^https:\/\/sensors-api/)
    leave(close)
  })

  it('adds through a type group\'s +, never the group of sensors with no type', () => {
    const { port } = fakeApp('sensor')
    const other = vi.fn()
    const typed = vi.fn(() => port.openDialog())
    withTypeGroup(-1, other)
    withTypeGroup(4, typed)
    const close = createSensorDemo(port)('add', NAME)
    expect(typed).toHaveBeenCalledOnce()
    expect(other).not.toHaveBeenCalled()
    expect(port.preselectType).not.toHaveBeenCalled()
    leave(close)
  })

  it('uses the empty list\'s Add sensor button when there is no type group', () => {
    const { port } = fakeApp('sensor')
    const button = document.createElement('button')
    button.dataset.tour = 'sensors-add'
    button.addEventListener('click', () => port.openDialog())
    anchored('panel-sensors')!.append(button)
    const close = createSensorDemo(port)('add', NAME)
    expect(port.preselectType).toHaveBeenCalledWith(4)
    expect(port.openDialog).toHaveBeenCalledOnce()
    leave(close)
  })

  it('expands the collapsed group that holds the new sensor', () => {
    const { port } = fakeApp('sensor')
    const group = withTypeGroup(4, () => port.openDialog())
    const header = group.querySelector('[aria-expanded]')!
    header.addEventListener('click', () => header.setAttribute('aria-expanded', 'true'))
    const sensorPort = { ...port, items: () => port.items().map(item => ({ ...item, groups: ['sensor-type:4'] })) }
    const close = walk(createSensorDemo(sensorPort), NAME, ['add', 'place'])
    expect(header.getAttribute('aria-expanded')).toBe('true')
    leave(close)
  })
})
