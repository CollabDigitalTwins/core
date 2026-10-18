// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LegendCard } from './LegendCard'

function toggle() {
  return screen.getByRole('button', { name: 'Layers' })
}

describe('LegendCard', () => {
  it('collapses and reopens its body on its own', () => {
    render(<LegendCard title="Layers" count={2} countTestId="count">body</LegendCard>)
    expect(screen.getByTestId('count').textContent).toBe('2')
    expect(screen.getByText('body')).toBeTruthy()

    fireEvent.click(toggle())

    expect(screen.queryByText('body')).toBeNull()
    expect(toggle().getAttribute('aria-expanded')).toBe('false')
  })

  it('leaves a controlled open state to its owner', () => {
    const onOpenChange = vi.fn()
    render(<LegendCard title="Layers" open={false} onOpenChange={onOpenChange}>body</LegendCard>)

    fireEvent.click(toggle())

    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.queryByText('body')).toBeNull()
  })

  it('offers a close button only when the card can be dismissed', () => {
    const onClose = vi.fn()
    const { rerender } = render(<LegendCard title="Layers">body</LegendCard>)
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()

    rerender(<LegendCard title="Layers" onClose={onClose} closeLabel="Close">body</LegendCard>)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
