// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { fitColumns, minRowWidth } from './pluginColumns'

import type { PluginColumn } from './pluginColumns'

const ALL: PluginColumn[] = ['name', 'version', 'status', 'run', 'install', 'enable', 'visibleTo', 'registry']

describe('fitColumns', () => {
  it('keeps every column when they fit', () => {
    expect(fitColumns(ALL, minRowWidth(ALL))).toEqual(ALL)
  })

  it('never returns columns wider than the space they are given', () => {
    for (let width = 10; width <= 70; width += 0.5) {
      expect(minRowWidth(fitColumns(ALL, width))).toBeLessThanOrEqual(Math.max(width, minRowWidth(['name', 'run'])))
    }
  })

  it('drops the version and registry columns before any control', () => {
    const fitted = fitColumns(ALL, minRowWidth(ALL) - 1)
    expect(fitted).not.toContain('version')
    expect(fitted).toEqual(expect.arrayContaining(['status', 'run', 'install', 'enable', 'visibleTo']))
  })

  it('keeps the name and the Run switch on the narrowest screen', () => {
    expect(fitColumns(ALL, 12)).toEqual(['name', 'run'])
  })

  it('keeps the columns in their original order', () => {
    const fitted = fitColumns(ALL, 40)
    expect(fitted).toEqual(ALL.filter(column => fitted.includes(column)))
  })

  it('treats an unmeasured width as room for everything', () => {
    expect(fitColumns(ALL, 0)).toEqual(ALL)
  })
})
