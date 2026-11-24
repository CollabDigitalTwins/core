// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { GuidedTour } from './GuidedTour'
import { useTour } from './useTour'

import type { TourSection, TourSections, TourStep } from './tourTypes'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, number>) => (values ? `${key} ${values.step}/${values.total}` : key),
}))

const STEPS: TourStep[] = [
  { id: 'welcome', target: null, title: 'Welcome', body: 'Start here.' },
  { id: 'filters', target: 'filters', title: 'Filters', body: 'Narrow the map.' },
  { id: 'done', target: null, title: 'Done', body: 'Observed — what was measured\nModelled — what was estimated' },
]

const appended: HTMLElement[] = []

function appendVisible(element: HTMLElement) {
  element.getClientRects = () => [{}] as unknown as DOMRectList
  document.body.append(element)
  appended.push(element)
  return element
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  appended.splice(0).forEach(element => element.remove())
})

describe('GuidedTour', () => {
  it('opens on the first step with its progress', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByText('progress 1/3')).toBeInTheDocument()
  })

  it('moves forward and back', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'next' }))
    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
  })

  it('passes over steps that ask to be skipped, both ways, and finishes when none are left', () => {
    const onHide = vi.fn()
    const steps = STEPS.map(s => (s.id === 'filters' ? { ...s, skip: () => true } : s))
    render(<GuidedTour steps={steps} onHide={onHide} />)
    fireEvent.click(screen.getByRole('button', { name: 'next' }))
    expect(onHide).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
  })

  it('reports each step as it opens', () => {
    const onStepChange = vi.fn()
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} onStepChange={onStepChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'next' }))
    expect(onStepChange.mock.calls.map(([id]) => id)).toEqual(['welcome', 'filters'])
  })

  it('keeps presses on the card from reaching the page, where open menus would close on them', () => {
    const onDocumentPress = vi.fn()
    document.addEventListener('pointerdown', onDocumentPress)
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} />)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'next' }))
    document.removeEventListener('pointerdown', onDocumentPress)
    expect(onDocumentPress).not.toHaveBeenCalled()
  })

  it('jumps to a step from its dot', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument()
  })

  it('hides when finished on the last step', () => {
    const onHide = vi.fn()
    render(<GuidedTour steps={STEPS} onHide={onHide} />)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.click(screen.getByRole('button', { name: 'finish' }))
    expect(onHide).toHaveBeenCalledOnce()
  })

  it('hides on Escape and from the hide button', () => {
    const onHide = vi.fn()
    render(<GuidedTour steps={STEPS} onHide={onHide} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: /hide/ }))
    expect(onHide).toHaveBeenCalledTimes(2)
  })

  it('steps with the arrow keys', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument()
  })

  it('steps with the arrow keys from a field the page focused, but leaves them to a field the person typed in', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} />)
    const field = appendVisible(document.createElement('input'))
    fireEvent.keyDown(field, { key: 'ArrowRight' })
    fireEvent.keyDown(field, { key: 'a' })
    fireEvent.keyDown(field, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument()
  })

  it('shows a loading placeholder while a step target has not appeared, then gives up quietly', () => {
    vi.useFakeTimers()
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'next' }))
    expect(screen.getByRole('status')).toHaveTextContent('missing')
    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('renders term lines as a definition list', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getAllByRole('term')[0]).toHaveTextContent('Observed')
    expect(screen.getAllByRole('definition')).toHaveLength(2)
  })

  it('lists step items, as buttons when they can be selected', () => {
    const onSelect = vi.fn()
    const items = [
      { id: 'map', term: 'Map', description: 'The city context.', onSelect },
      { id: 'bim', term: 'BIM', description: 'Models.' },
    ]
    render(<GuidedTour steps={[{ ...STEPS[0], items }]} onHide={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Map/ }))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: /BIM/ })).not.toBeInTheDocument()
    expect(screen.getByText('Models.')).toBeInTheDocument()
  })

  it('opens on the step named by startAt', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} startAt="filters" />)
    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument()
  })

  it('calls onFinish instead of onHide when finished', () => {
    const onHide = vi.fn()
    const onFinish = vi.fn()
    render(<GuidedTour steps={STEPS} onHide={onHide} onFinish={onFinish} startAt="done" />)
    fireEvent.click(screen.getByRole('button', { name: 'finish' }))
    expect(onFinish).toHaveBeenCalledOnce()
    expect(onHide).not.toHaveBeenCalled()
  })

  it('uses the labels it is given', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} labels={{ next: 'Onward', progress: (n, total) => `${n} of ${total}` }} />)
    expect(screen.getByRole('button', { name: 'Onward' })).toBeInTheDocument()
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
  })

  it('runs a step entry callback once when the step opens', () => {
    const onEnter = vi.fn()
    const { rerender } = render(<GuidedTour steps={[STEPS[0], { ...STEPS[1], onEnter }]} onHide={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'next' }))
    rerender(<GuidedTour steps={[STEPS[0], { ...STEPS[1], onEnter }]} onHide={vi.fn()} />)
    expect(onEnter).toHaveBeenCalledOnce()
  })

  it('runs the cleanup an entry callback returns when the step closes', () => {
    const cleanup = vi.fn()
    render(<GuidedTour steps={[{ ...STEPS[0], onEnter: () => cleanup }, STEPS[1]]} onHide={vi.fn()} />)
    expect(cleanup).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'next' }))
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('finishes when an invited target is clicked', () => {
    const link = appendVisible(document.createElement('a'))
    const onHide = vi.fn()
    render(<GuidedTour steps={[{ id: 'report', target: () => link, title: 'Report', body: 'Open it.', invite: true }]} onHide={onHide} />)
    fireEvent.click(link)
    expect(onHide).toHaveBeenCalledOnce()
  })

  it('resolves a string target to its data-tour anchor', () => {
    const anchor = document.createElement('div')
    anchor.dataset.tour = 'filters'
    const scrollIntoView = vi.fn()
    anchor.scrollIntoView = scrollIntoView
    appendVisible(anchor)
    render(<GuidedTour steps={[STEPS[1]]} onHide={vi.fn()} />)
    expect(scrollIntoView).toHaveBeenCalled()
  })
})

describe('useTour', () => {
  const memoryStore = () => {
    const done = new Set<string>()
    return { isDone: (id: string) => done.has(id), markDone: (id: string) => void done.add(id) }
  }

  it('opens a tour that is not done and remembers hiding it', () => {
    const store = memoryStore()
    const { result } = renderHook(() => useTour('map', store))
    expect(result.current.open).toBe(true)
    act(() => result.current.hide())
    expect(result.current.open).toBe(false)
    expect(store.isDone('map')).toBe(true)
  })

  it('starts closed once done, and reopens on start', () => {
    const store = memoryStore()
    store.markDone('map')
    const { result } = renderHook(() => useTour('map', store))
    expect(result.current.open).toBe(false)
    act(() => result.current.start())
    expect(result.current.open).toBe(true)
  })
})

describe('GuidedTour sections dialog', () => {
  const OTHER_START = vi.fn()
  const SECTIONS: TourSection[] = [
    { id: 'intro', title: 'Intro', steps: STEPS.map(({ id, title }) => ({ id, title })), start: vi.fn() },
    { id: 'sensors', title: 'Sensors', description: 'Live readings.', steps: [{ id: 'add', title: 'Add a sensor' }, { id: 'delete', title: 'Delete it' }], start: OTHER_START },
  ]
  const sections: TourSections = { current: 'intro', list: () => SECTIONS }

  const openDialog = () => {
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    return screen.getByRole('dialog', { name: 'title' })
  }

  afterEach(() => OTHER_START.mockClear())

  it('shows no sections button without sections', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'open' })).not.toBeInTheDocument()
  })

  it('lists every section and marks the open step', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} sections={sections} startAt="filters" />)
    const dialog = openDialog()
    expect(within(dialog).getByRole('navigation').textContent).toContain('Sensors')
    expect(within(dialog).getByRole('button', { name: /Filters/ })).toHaveAttribute('aria-current', 'step')
    expect(screen.queryByRole('heading', { name: 'Filters', level: 3 })).toBeNull()
  })

  it('goes back to the step it left from, and on Escape', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} sections={sections} startAt="filters" />)
    fireEvent.click(within(openDialog()).getByRole('button', { name: /back/ }))
    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument()
    fireEvent.keyDown(openDialog(), { key: 'Escape' })
    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument()
  })

  it('moves within the open tour when a step of its own section is picked', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} sections={sections} />)
    fireEvent.click(within(openDialog()).getByRole('button', { name: /Done/ }))
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument()
  })

  it('starts another section on the picked step', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} sections={sections} />)
    const dialog = openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: /Sensors/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: /Delete it/ }))
    expect(OTHER_START).toHaveBeenCalledWith('delete')
  })

  it('searches the steps of every section, ignoring case and accents', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} sections={sections} />)
    const dialog = openDialog()
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: 'SÉNSOR' } })
    const results = within(dialog).getAllByRole('listitem').map(li => li.textContent)
    expect(results).toHaveLength(2)
    expect(results[0]).toContain('Add a sensor')
  })

  it('ignores the arrow keys while open, so typing in the search does not move the tour', () => {
    render(<GuidedTour steps={STEPS} onHide={vi.fn()} sections={sections} />)
    openDialog()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: /back/ }))
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
  })
})
