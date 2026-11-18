// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { GuidedTour } from './GuidedTour'
import { useTour } from './useTour'

import type { TourStep } from './tourTypes'

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
