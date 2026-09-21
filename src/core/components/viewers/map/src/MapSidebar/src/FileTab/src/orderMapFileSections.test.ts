// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { orderMapFileSections } from './orderMapFileSections'

import type { FileSection } from '../../../../../../../ui/FilesManager/src/fileType'

const ids: FileSection[] = ['bim', 'models', 'pointClouds', 'files']

describe('orderMapFileSections', () => {
  it('keeps the given order while every section is open', () => {
    const open = { bim: true, models: true, pointClouds: true, files: true }

    expect(orderMapFileSections(ids, open)).toEqual(ids)
  })

  it('sinks a collapsed section below the open ones', () => {
    const open = { bim: true, models: false, pointClouds: true, files: true }

    expect(orderMapFileSections(ids, open)).toEqual(['bim', 'pointClouds', 'files', 'models'])
  })

  it('keeps the collapsed sections in their own stable order', () => {
    const open = { bim: false, models: true, pointClouds: false, files: false }

    expect(orderMapFileSections(ids, open)).toEqual(['models', 'bim', 'pointClouds', 'files'])
  })
})
