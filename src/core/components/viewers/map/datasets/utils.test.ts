// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { formatName, formatDate, reorderedDatasets, sortByOrder, stripHtml } from './utils'

describe('formatName', () => {
  it('returns empty string for empty input', () => {
    expect(formatName('')).toBe('')
  })

  it('capitalises only the first letter when the input already has spaces', () => {
    expect(formatName('hello world')).toBe('Hello world')
  })

  it('converts a slug to a title (underscores and hyphens)', () => {
    expect(formatName('open_data_portal')).toBe('Open Data Portal')
    expect(formatName('open-data-portal')).toBe('Open Data Portal')
    expect(formatName('open__data--portal')).toBe('Open Data Portal')
  })
})

describe('formatDate', () => {
  it('formats an ISO date to YYYY-MM-DD', () => {
    expect(formatDate('2024-03-15T12:30:00Z')).toBe('2024-03-15')
  })

  it('returns the original string when parsing fails', () => {
    // Date constructor returns Invalid Date; toISOString throws → caught → original returned.
    expect(formatDate('not-a-real-date')).toBe('not-a-real-date')
  })
})

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world')
  })

  it('trims surrounding whitespace', () => {
    expect(stripHtml('  <span>x</span>  ')).toBe('x')
  })

  it('returns empty string for null-ish input', () => {
    expect(stripHtml(undefined as unknown as string)).toBe('')
    expect(stripHtml('')).toBe('')
  })
})

describe('sortByOrder', () => {
  it('puts the highest order on top', () => {
    const sorted = sortByOrder([{ name: 'a', order: 0 }, { name: 'b', order: 2 }, { name: 'c', order: 1 }])
    expect(sorted.map(d => d.name)).toEqual(['b', 'c', 'a'])
  })

  it('keeps unordered datasets in list position, numbering them top-down', () => {
    const sorted = sortByOrder([{ name: 'first' }, { name: 'second' }, { name: 'third' }])
    expect(sorted.map(d => [d.name, d.order])).toEqual([['first', 2], ['second', 1], ['third', 0]])
  })
})

describe('reorderedDatasets', () => {
  const display = [{ name: 'a', order: 2 }, { name: 'b', order: 1 }, { name: 'c', order: 0 }]

  it('moves the dragged row onto the target and renumbers top-down', () => {
    const moved = reorderedDatasets(display, 'c', 'a')
    expect(moved?.map(d => [d.name, d.order])).toEqual([['c', 2], ['a', 1], ['b', 0]])
  })

  it('reports nothing moved for a drop on itself or an unknown row', () => {
    expect(reorderedDatasets(display, 'a', 'a')).toBeUndefined()
    expect(reorderedDatasets(display, 'a', 'missing')).toBeUndefined()
  })
})
