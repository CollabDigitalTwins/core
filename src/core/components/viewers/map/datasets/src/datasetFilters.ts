// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Dataset } from '../../../../../types/datasetTypes'

export interface DatasetFilters {
  countrySubdivisions: string[]
  municipalities: string[]
  types: string[]
  sources: string[]
}

export type DatasetFilterKey = keyof DatasetFilters

export const DATASET_FILTER_KEYS: DatasetFilterKey[] = ['countrySubdivisions', 'municipalities', 'types', 'sources']

export const EMPTY_FILTERS: DatasetFilters = { countrySubdivisions: [], municipalities: [], types: [], sources: [] }

type FilterableDataset = Pick<Dataset, 'countrySubdivision' | 'municipality' | 'type' | 'publisher' | 'portal'>

const VALUE_OF: Record<DatasetFilterKey, (dataset: FilterableDataset) => string | undefined> = {
  countrySubdivisions: dataset => dataset.countrySubdivision,
  municipalities: dataset => dataset.municipality,
  types: dataset => dataset.type,
  sources: dataset => dataset.portal?.name ?? dataset.publisher,
}

const ANYWHERE_WHEN_BLANK = new Set<DatasetFilterKey>(['countrySubdivisions', 'municipalities'])

/** The values to offer for `key`: those the datasets hold, plus any still selected, so an active filter can always be cleared. */
export function filterOptions(datasets: FilterableDataset[], key: DatasetFilterKey, selected: string[]): string[] {
  const values = new Set(selected)
  for (const dataset of datasets) {
    const value = VALUE_OF[key](dataset)
    if (value) values.add(value)
  }
  return [...values].sort()
}

/** True when `dataset` passes every active filter; a dataset with no place passes the place filters. */
export function matchesFilters(dataset: FilterableDataset, filters: DatasetFilters): boolean {
  return DATASET_FILTER_KEYS.every((key) => {
    const selected = filters[key]
    if (selected.length === 0) return true
    const value = VALUE_OF[key](dataset)
    if (!value) return ANYWHERE_WHEN_BLANK.has(key)
    return selected.includes(value)
  })
}

export function activeFilterCount(filters: DatasetFilters): number {
  return DATASET_FILTER_KEYS.reduce((total, key) => total + filters[key].length, 0)
}

export function withoutFilterValue(filters: DatasetFilters, key: DatasetFilterKey, value: string): DatasetFilters {
  return { ...filters, [key]: filters[key].filter(selected => selected !== value) }
}
