// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { orderFileTabSections } from './orderFileTabSections'

import type { FileSection } from '../../../../../../../ui/FilesManager/src/fileType'

const order: FileSection[] = ['bim', 'pointClouds', 'models', 'files']

describe('orderFileTabSections', () => {
  it('keeps the given order when every section has items', () => {
    expect(orderFileTabSections(order, { bim: 1, pointClouds: 2, models: 3, files: 4 }))
      .toEqual(['bim', 'pointClouds', 'models', 'files'])
  })

  it('sinks an empty section below the populated ones', () => {
    expect(orderFileTabSections(order, { bim: 0, pointClouds: 2, models: 3, files: 4 }))
      .toEqual(['pointClouds', 'models', 'files', 'bim'])
  })

  it('keeps empty sections in their relative order at the bottom', () => {
    expect(orderFileTabSections(order, { bim: 0, pointClouds: 1, models: 0, files: 0 }))
      .toEqual(['pointClouds', 'bim', 'models', 'files'])
  })

  it('leaves an all-empty tab in the given order', () => {
    expect(orderFileTabSections(order, { bim: 0, pointClouds: 0, models: 0, files: 0 }))
      .toEqual(['bim', 'pointClouds', 'models', 'files'])
  })

  it('honours a user order among the populated sections', () => {
    const reordered: FileSection[] = ['files', 'models', 'bim', 'pointClouds']
    expect(orderFileTabSections(reordered, { bim: 1, pointClouds: 0, models: 2, files: 0 }))
      .toEqual(['models', 'bim', 'files', 'pointClouds'])
  })
})
