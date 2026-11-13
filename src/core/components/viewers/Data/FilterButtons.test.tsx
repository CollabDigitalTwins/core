// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import FilterButtons from './FilterButtons'

import type { FilterState } from '../../../types/global'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('../../../store', () => ({ usePermissions: () => ({ ability: { can: () => true } }) }))
vi.mock('../../../hooks/buildings/buildings', () => ({ useBuildings: () => ({ buildings: [] }) }))
vi.mock('../../../hooks/sites/sites', () => ({ useSites: () => ({ sites: [] }) }))
vi.mock('../../../hooks/infrastructures/infrastructures', () => ({ useInfrastructures: () => ({ infrastructures: [] }) }))
vi.mock('./advancedFilter/FiltersDialog', () => ({ default: () => null }))
vi.mock('./details/FilterFiles', () => ({ default: () => null }))
vi.mock('../../ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const data = [
  { id: 1, buildingMunicipality: 'Ottawa', buildingCountrySubdivision: 'ON' },
  { id: 2, buildingMunicipality: 'Toronto', buildingCountrySubdivision: 'ON' },
]

const inList = (field: string, value: string[]): FilterState =>
  ({ id: 1, field, fieldType: 'string', operator: 'inList', value, secondValue: null })

const renderWith = (activeFilters: FilterState[], currentViewer = 'buildings', setActiveFilters = vi.fn()) => (
  <FilterButtons
    currentViewer={currentViewer}
    filters={[]}
    activeFilters={activeFilters}
    filterFields={[]}
    data={data}
    setFilters={vi.fn()}
    setActiveFilters={setActiveFilters}
  />
)

const isChecked = (label: string) => screen.getByLabelText(label).getAttribute('aria-checked') === 'true'

describe('FilterButtons', () => {
  it('unchecks a value when it disappears from activeFilters', () => {
    const { rerender } = render(renderWith([inList('buildingMunicipality', ['Ottawa']), inList('buildingCountrySubdivision', ['ON'])]))
    expect(isChecked('Ottawa')).toBe(true)

    rerender(renderWith([inList('buildingCountrySubdivision', ['ON'])]))
    expect(isChecked('Ottawa')).toBe(false)
    expect(isChecked('ON')).toBe(true)
  })

  it('unchecks everything when activeFilters becomes empty', () => {
    const { rerender } = render(renderWith([inList('buildingMunicipality', ['Ottawa', 'Toronto'])]))
    expect(isChecked('Toronto')).toBe(true)

    rerender(renderWith([]))
    expect(isChecked('Ottawa')).toBe(false)
    expect(isChecked('Toronto')).toBe(false)
  })

  it('keeps active filters when it remounts', () => {
    const setActiveFilters = vi.fn()
    const active = [inList('fileType', ['pdf']), inList('site', ['3'])]
    const { unmount } = render(renderWith(active, 'files', setActiveFilters))
    unmount()
    render(renderWith(active, 'files', setActiveFilters))

    expect(setActiveFilters).not.toHaveBeenCalled()
  })

  it('resets active filters when the viewer changes', () => {
    const setActiveFilters = vi.fn()
    const { rerender } = render(renderWith([inList('buildingMunicipality', ['Ottawa'])], 'buildings', setActiveFilters))
    rerender(renderWith([inList('buildingMunicipality', ['Ottawa'])], 'sites', setActiveFilters))

    expect(setActiveFilters).toHaveBeenCalledWith([])
  })
})
