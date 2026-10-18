// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { LegendRows } from './LegendRows'

const rows = ['Park', 'School', 'Library'].map(label => ({ label, swatch: '#ff0000' }))

describe('LegendRows', () => {
  it('draws a colour string as a plain square beside its label', () => {
    const { container } = render(<LegendRows rows={rows.slice(0, 1)} />)
    const square = container.querySelector('li span[aria-hidden="true"]') as HTMLElement
    expect(square.style.backgroundColor).toBe('rgb(255, 0, 0)')
    expect(screen.getByText('Park')).toBeTruthy()
  })

  it('renders a node swatch as given', () => {
    render(<LegendRows rows={[{ label: 'Park', swatch: <img alt="park icon" /> }]} />)
    expect(screen.getByAltText('park icon')).toBeTruthy()
  })

  it('stops at the limit and counts the rest on a closing line', () => {
    render(<LegendRows rows={rows} limit={2} moreLabel={count => `+${count} more`} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('+1 more')).toBeTruthy()
  })

  it('omits the closing line when every row fits', () => {
    render(<LegendRows rows={rows} limit={3} moreLabel={count => `+${count} more`} />)
    expect(screen.queryByText(/more/)).toBeNull()
  })

  it('dims a hidden row and keeps its trailing controls', () => {
    render(<LegendRows rows={[{ label: 'Park', swatch: '#000', dimmed: true, trailing: <span>12</span> }]} />)
    expect(screen.getByRole('listitem').className).toContain('opacity-50')
    expect(screen.getByText('12')).toBeTruthy()
  })
})
