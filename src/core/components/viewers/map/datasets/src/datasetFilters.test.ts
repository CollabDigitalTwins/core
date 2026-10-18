// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { activeFilterCount, EMPTY_FILTERS, filterOptions, matchesFilters, withoutFilterValue } from './datasetFilters'

import type { Dataset } from '../../../../../types/datasetTypes'

const dataset = (changes: Partial<Dataset>) => ({ name: 'd', countrySubdivision: '', municipality: '', type: 'GeoJSON', ...changes }) as Dataset

describe('datasetFilters', () => {
  it('lists the values datasets hold, and keeps an active value no dataset has so it can be turned off', () => {
    const datasets = [dataset({ type: 'GeoJSON' }), dataset({ type: 'Feature Layer' })]
    expect(filterOptions(datasets, 'types', ['WMS'])).toEqual(['Feature Layer', 'GeoJSON', 'WMS'])
  })

  it('reads subdivisions from countrySubdivision and sources from the portal name, then the publisher', () => {
    const datasets = [
      dataset({ countrySubdivision: 'ON', publisher: 'City' }),
      dataset({ countrySubdivision: 'QC', publisher: 'X', portal: { name: 'Open Canada' } as Dataset['portal'] }),
    ]
    expect(filterOptions(datasets, 'countrySubdivisions', [])).toEqual(['ON', 'QC'])
    expect(filterOptions(datasets, 'sources', [])).toEqual(['City', 'Open Canada'])
  })

  it('lets a dataset with no place through place filters but not through type or source filters', () => {
    const national = dataset({ type: 'GeoJSON', publisher: 'Canada' })
    expect(matchesFilters(national, { ...EMPTY_FILTERS, countrySubdivisions: ['ON'] })).toBe(true)
    expect(matchesFilters(national, { ...EMPTY_FILTERS, types: ['WMS'] })).toBe(false)
    expect(matchesFilters(national, { ...EMPTY_FILTERS, sources: ['Toronto'] })).toBe(false)
  })

  it('counts and removes single values', () => {
    const filters = { ...EMPTY_FILTERS, types: ['WMS', 'GeoJSON'], sources: ['Toronto'] }
    expect(activeFilterCount(filters)).toBe(3)
    expect(withoutFilterValue(filters, 'types', 'WMS')).toEqual({ ...filters, types: ['GeoJSON'] })
  })
})
