// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).map(String).join('/')}` : key,
}))
vi.mock('react-map-gl/maplibre', () => ({
  Popup: ({ children }: any) => <div>{children}</div>,
}))

import { MapContext } from '../../../../../../store'

import { MapPopupStack } from './MapPopupStack'

import type { PopupEntry, PopupStack } from '../../../../../../types/map'

const entry = (id: string, title: string): PopupEntry => ({
  id, layerId: 'l', priority: 100, title,
  coordinates: [0, 0],
  render: (header) => <div>{header}<p>{`body-${id}`}</p></div>,
})

function renderStack(popupStack: PopupStack | null) {
  const dispatch = vi.fn()
  render(
    <MapContext.Provider value={{ state: { map: { popupStack } } as never, dispatch }}>
      <MapPopupStack />
    </MapContext.Provider>,
  )
  return dispatch
}

describe('MapPopupStack', () => {
  it('renders nothing when there is no stack', () => {
    const { container } = render(
      <MapContext.Provider value={{ state: { map: { popupStack: null } } as never, dispatch: vi.fn() }}>
        <MapPopupStack />
      </MapContext.Provider>,
    )
    expect(container.textContent).toBe('')
  })

  it('renders the active body with a close button but no arrows for a single entry', () => {
    renderStack({ entries: [entry('a', 'Building')], activeIndex: 0 })

    expect(screen.getByText('body-a')).toBeTruthy()
    expect(screen.getByLabelText('close')).toBeTruthy()
    expect(screen.queryByLabelText('next')).toBeNull()
  })

  it('shows the counter header and the active title for two or more entries', () => {
    renderStack({ entries: [entry('a', 'Building'), entry('b', 'Zoning')], activeIndex: 1 })

    expect(screen.getByText(/counter:2\/2/)).toBeTruthy()
    expect(screen.getByText(/Zoning/)).toBeTruthy()
    expect(screen.getByText('body-b')).toBeTruthy()
  })

  it('arrows step the index in both directions, letting the reducer wrap', () => {
    const dispatch = renderStack({ entries: [entry('a', 'A'), entry('b', 'B')], activeIndex: 0 })

    fireEvent.click(screen.getByLabelText('next'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_POPUP_INDEX', payload: { activeIndex: 1 } })

    fireEvent.click(screen.getByLabelText('previous'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_POPUP_INDEX', payload: { activeIndex: -1 } })
  })

  it('closing clears the whole stack, not just the active entry', () => {
    const dispatch = renderStack({ entries: [entry('a', 'A'), entry('b', 'B')], activeIndex: 0 })

    fireEvent.click(screen.getByLabelText('close'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_POPUP_STACK', payload: null })
  })
})
