// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('../../Placement/usePlacementSession', () => ({ usePlacementSession: () => null }))

import { PositionSection } from './PositionSection'

import type { PlacementTarget } from '../../Placement/placementTarget'

const target = (overrides: Partial<PlacementTarget> = {}): PlacementTarget => ({
  id: '41',
  name: 'scan.ply',
  capabilities: { rotation: 'yaw', scale: true },
  object: () => null,
  read: () => ({ position: [1, 2, 3], rotation: [0, 0, 0], scale: 1, sourceUp: 'y' }),
  apply: vi.fn(),
  bounds: () => null,
  commit: vi.fn(async () => {}),
  ...overrides,
})

describe('PositionSection', () => {
  it('shows a field per axis', () => {
    render(<PositionSection target={target()} isExpanded onToggleAction={vi.fn()} onEditInViewport={vi.fn()} />)
    for (const axis of ['X', 'Y', 'Z']) expect(screen.getByLabelText(axis)).toBeInTheDocument()
  })

  it('hides scale for a target that cannot store it', () => {
    const yawOnly = target({ capabilities: { rotation: 'yaw', scale: false } })
    render(<PositionSection target={yawOnly} isExpanded onToggleAction={vi.fn()} onEditInViewport={vi.fn()} />)
    expect(screen.queryByLabelText('scale')).not.toBeInTheDocument()
  })

  it('applies a typed value to the object straight away', () => {
    const applied = vi.fn()
    render(<PositionSection target={target({ apply: applied })} isExpanded onToggleAction={vi.fn()} onEditInViewport={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('X'), { target: { value: '5' } })

    expect(applied).toHaveBeenCalled()
  })

  it('commits once the typing stops rather than per keystroke', () => {
    vi.useFakeTimers()
    try {
      const committed = vi.fn(async () => {})
      render(<PositionSection target={target({ commit: committed })} isExpanded onToggleAction={vi.fn()} onEditInViewport={vi.fn()} />)

      fireEvent.change(screen.getByLabelText('X'), { target: { value: '5' } })
      expect(committed).not.toHaveBeenCalled()

      act(() => { vi.advanceTimersByTime(400) })
      expect(committed).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders nothing without a target', () => {
    const { container } = render(
      <PositionSection target={null} isExpanded onToggleAction={vi.fn()} onEditInViewport={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
