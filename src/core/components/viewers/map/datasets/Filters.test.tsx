// @vitest-environment jsdom
import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Mutable permission mock — flip canRead before render() to test the disabled branch.
const state = vi.hoisted(() => ({ canRead: true }))

vi.mock('next-intl', () => ({
  // The component uses `t('xLower')` both as the label AND as the dataset
  // field name (via `dataset[label]` in getUniqueValues), AND matches it
  // against the switch case in handleFilterChange. The only consistent set
  // of return values is the short form: "subdivision"/"municipality"/...
  useTranslations: () => (key: string) => {
    const mapping: Record<string, string> = {
      filters: 'Filters',
      countrySubdivision: 'Subdivision',
      countrySubdivisionLower: 'subdivision',
      municipality: 'Municipality',
      municipalityLower: 'municipality',
      type: 'Type',
      typeLower: 'type',
      source: 'Source',
      sourceLower: 'source',
    }
    return mapping[key] ?? key
  },
}))
vi.mock('../../../../store', () => ({
  usePermissions: () => ({ ability: { can: () => state.canRead } }),
}))
vi.mock('../../../../components/ui/', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
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
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div role="menuitem" onClick={onClick}>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}))

import Filters from './Filters'

const emptyFilters = { countrySubdivisions: [], municipalities: [], types: [], sources: [] }

// Field names match the keys the component reads via `dataset[label]` —
// "subdivision"/"municipality"/"type" — not the camelCase Dataset type.
const sampleDatasets: any[] = [
  { name: 'A', publisher: 'City Hall',    subdivision: 'ON', municipality: 'Toronto',  type: 'roads' },
  { name: 'B', publisher: 'Open Data Co', subdivision: 'QC', municipality: 'Montreal', type: 'buildings' },
  { name: 'C', portal: { name: 'Provincial Portal' }, publisher: 'X', subdivision: 'ON', municipality: 'Ottawa', type: 'roads' },
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
    expect(screen.getByTestId('badge')).toHaveTextContent('3')
  })

  it('shows the four top-level filter categories', () => {
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={vi.fn()} />)
    const items = screen.getAllByRole('menuitem')
    const labels = items.map(el => el.textContent)
    expect(labels).toEqual(expect.arrayContaining(['Subdivision', 'Municipality', 'Type', 'Source']))
  })

  it('switches to the nested filter view when a category is clicked and lists unique values', () => {
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('menuitem', { name: 'Subdivision' }))

    // Two unique subdivision values across the 3 datasets: ON, QC.
    expect(screen.getByTestId('nested-filter')).toBeInTheDocument()
    expect(screen.getByTestId('available-count')).toHaveTextContent('2')
  })

  it('uses portal.name (falling back to publisher) for source uniqueness', () => {
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Source' }))
    // City Hall, Open Data Co, Provincial Portal (from portal.name on C) → 3 unique.
    expect(screen.getByTestId('available-count')).toHaveTextContent('3')
  })

  it('forwards onFiltersChange with the right field when a nested value is picked', () => {
    const onFiltersChange = vi.fn()
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={onFiltersChange} />)

    fireEvent.click(screen.getByRole('menuitem', { name: 'Type' }))
    fireEvent.click(screen.getByRole('button', { name: 'pick' }))

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ types: ['picked'] }))
  })

  it('is disabled when the user lacks read permission on File', () => {
    state.canRead = false
    render(<Filters datasets={sampleDatasets} appliedFilters={emptyFilters} onFiltersChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Filters' })).toBeDisabled()
  })
})
