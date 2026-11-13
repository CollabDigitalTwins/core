// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { removeFilterValue } from './filterHelper'

import type { FilterState } from '../../../../types/global'

const filter = (id: number, value: FilterState['value']): FilterState =>
  ({ id, field: 'buildingName', fieldType: 'string', operator: Array.isArray(value) ? 'inList' : 'contains', value, secondValue: null })

describe('removeFilterValue', () => {
  it('removes only the filter with the given id when two share a field', () => {
    expect(removeFilterValue([filter(1, 'Hall'), filter(2, 'North')], 2)).toEqual([filter(1, 'Hall')])
  })

  it('drops one value from a list filter and the filter once it is empty', () => {
    const afterOne = removeFilterValue([filter(1, ['A', 'B'])], 1, 'A')
    expect(afterOne).toEqual([filter(1, ['B'])])
    expect(removeFilterValue(afterOne, 1, 'B')).toEqual([])
  })
})
