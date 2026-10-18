// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mutable permission mock — flip canRead before render() to test the disabled branch.
const state = vi.hoisted(() => ({ canRead: true }))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: { value?: string }) => {
    const mapping: Record<string, string> = {
      filters: 'Filters',
      countrySubdivision: 'Subdivision',
      municipality: 'Municipality',
      type: 'Type',
      source: 'Source',
    }
    return values?.value ? `${key}:${values.value}` : mapping[key] ?? key
  },
}))
vi.mock('../../../../store', () => ({
  usePermissions: () => ({ ability: { can: () => state.canRead } }),
}))
vi.mock('../../../../components/ui/', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
  Button: ({ children, onClick, disabled, 'aria-label': ariaLabel }: any) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{children}</button>
  ),
}))
vi.mock('./NestedFilter', () => ({
  __esModule: true,
  default: ({ label, availableValues, onSelectionChange }: any) => (
    <div data-testid="nested-filter">
      <span>{label}</span>
      <span data-testid="available-count">{availableValues.length}</span>
      <button onClick={() => onSelectionChange(['picked'])}>pick</button>
    </div>
  ),
}))
vi.mock('../../../../components/ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, onSelect, disabled, 'aria-label': ariaLabel }: any) => (
    <div role="menuitem" aria-label={ariaLabel} aria-disabled={disabled} onClick={(e: any) => { onSelect?.({ preventDefault: () => {} }); onClick?.(e) }}>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}))

import Filters from './Filters'

const emptyFilters = { countrySubdivisions: [], municipalities: [], types: [], sources: [] }

const sampleDatasets: any[] = [
  { name: 'A', publisher: 'City Hall',    countrySubdivision: 'ON', municipality: 'Toronto',  type: 'roads' },
  { name: 'B', publisher: 'Open Data Co', countrySubdivision: 'QC', municipality: 'Montreal', type: 'buildings' },
  { name: 'C', portal: { name: 'Provincial Portal' }, publisher: 'X', countrySubdivision: 'ON', municipality: 'Ottawa', type: 'roads' },
]

beforeEach(() => {
  state.canRead = true
})

describe('Filters', () => {
  it('renders the filter button with no badge when no filters are applied', () => {
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument()
  })

  it('shows the total-count badge when at least one filter is applied', () => {
    const applied = { countrySubdivisions: ['ON', 'QC'], municipalities: [], types: ['roads'], sources: [] }
    render(<Filters datasets={sampleDatasets} appliedFilters={applied} onFiltersChange={vi.fn()} />)
    expect(screen.getAllByTestId('badge')[0]).toHaveTextContent('3')
  })

  it('shows the four top-level filter categories', () => {
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={vi.fn()} />)
    const items = screen.getAllByRole('menuitem')
    const labels = items.map(el => el.textContent)
    expect(labels).toEqual(expect.arrayContaining(['Subdivision', 'Municipality', 'Type', 'Source']))
  })

  it('keeps an active value in its list even when no dataset holds it any more', () => {
    render(<Filters datasets={sampleDatasets} appliedFilters={{ ...emptyFilters, types: ['WMS'] }} onFiltersChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('menuitem', { name: /^Type/ }))
    expect(screen.getByTestId('available-count')).toHaveTextContent('3')
  })

  it('lists the active filters with a remove button for each', () => {
    const onFiltersChange = vi.fn()
    render(<Filters datasets={sampleDatasets} appliedFilters={{ ...emptyFilters, types: ['WMS'], sources: ['City Hall'] }} onFiltersChange={onFiltersChange} />)
    fireEvent.click(screen.getByRole('menuitem', { name: 'removeFilter:WMS' }))
    expect(onFiltersChange).toHaveBeenCalledWith({ ...emptyFilters, sources: ['City Hall'] })
  })

  it('clears every filter from the button beside the trigger', () => {
    const onFiltersChange = vi.fn()
    render(<Filters datasets={sampleDatasets} appliedFilters={{ ...emptyFilters, types: ['WMS'], municipalities: ['Toronto'] }} onFiltersChange={onFiltersChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'clearAll' }))
    expect(onFiltersChange).toHaveBeenCalledWith(emptyFilters)
  })

  it('offers no clear button while no filter is active', () => {
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'clearAll' })).toBeNull()
  })

  it('switches to the nested filter view when a category is clicked and lists unique values', () => {
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('menuitem', { name: /^Subdivision/ }))

    // Two unique subdivision values across the 3 datasets: ON, QC.
    expect(screen.getByTestId('nested-filter')).toBeInTheDocument()
    expect(screen.getByTestId('available-count')).toHaveTextContent('2')
  })

  it('uses portal.name (falling back to publisher) for source uniqueness', () => {
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('menuitem', { name: /^Source/ }))
    // City Hall, Open Data Co, Provincial Portal (from portal.name on C) → 3 unique.
    expect(screen.getByTestId('available-count')).toHaveTextContent('3')
  })

  it('forwards onFiltersChange with the right field when a nested value is picked', () => {
    const onFiltersChange = vi.fn()
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={onFiltersChange} />)

    fireEvent.click(screen.getByRole('menuitem', { name: /^Type/ }))
    fireEvent.click(screen.getByRole('button', { name: 'pick' }))

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ types: ['picked'] }))
  })

  it('is disabled when the user lacks read permission on File', () => {
    state.canRead = false
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Filters' })).toBeDisabled()
  })
})
