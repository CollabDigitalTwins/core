// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ActiveFilterChips from './ActiveFilterChips'

import type { FilterState } from '../../../types/global'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => values ? `${key}:${Object.values(values).join(',')}` : key,
}))

const activeFilters: FilterState[] = [
  { id: 1, field: 'buildingMunicipality', fieldType: 'string', operator: 'inList', value: ['Ottawa', 'Toronto'], secondValue: null },
  { id: 2, field: 'buildingName', fieldType: 'string', operator: 'contains', value: 'Hall', secondValue: null },
]

describe('ActiveFilterChips', () => {
  it('renders one chip per value and calls onRemove', () => {
    const onRemove = vi.fn()
    render(<ActiveFilterChips activeFilters={activeFilters} onRemove={onRemove} onClearAll={vi.fn()} />)

    expect(screen.getByText('buildingMunicipality: Ottawa')).toBeTruthy()
    expect(screen.getByText('buildingMunicipality: Toronto')).toBeTruthy()
    expect(screen.getByText('buildingName: Hall')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'removeFilter:buildingMunicipality: Ottawa' }))
    expect(onRemove).toHaveBeenCalledWith(1, 'Ottawa')

    fireEvent.click(screen.getByRole('button', { name: 'removeFilter:buildingName: Hall' }))
    expect(onRemove).toHaveBeenCalledWith(2, undefined)
  })

  it('removes only the clicked one of two filters on the same field', () => {
    const onRemove = vi.fn()
    const sameField: FilterState[] = [
      { id: 7, field: 'buildingName', fieldType: 'string', operator: 'contains', value: 'Hall', secondValue: null },
      { id: 8, field: 'buildingName', fieldType: 'string', operator: 'startsWith', value: 'North', secondValue: null },
    ]
    render(<ActiveFilterChips activeFilters={sameField} onRemove={onRemove} onClearAll={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'removeFilter:buildingName: North' }))
    expect(onRemove).toHaveBeenCalledOnce()
    expect(onRemove).toHaveBeenCalledWith(8, undefined)
  })

  it('Clear all calls onClearAll', () => {
    const onClearAll = vi.fn()
    render(<ActiveFilterChips activeFilters={activeFilters} onRemove={vi.fn()} onClearAll={onClearAll} />)

    fireEvent.click(screen.getByRole('button', { name: 'clearAll' }))
    expect(onClearAll).toHaveBeenCalledOnce()
  })
})
