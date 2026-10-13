// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { partitionFileTab } from './partitionFileTab'

import type { DbFile } from '../../../../../../../../types/dbTypes'

const file = (overrides: Partial<DbFile>): DbFile => ({
  id: 1,
  name: 'model.frag',
  extension: 'frag',
  tag: 'bim-file',
  type: 'system',
  ...overrides,
} as DbFile)

describe('partitionFileTab', () => {
  it('keeps a model placed on the map once it is linked to the building', () => {
    const placed = file({ id: 773, type: 'map-file', attachedFilesBuildingId: 4414 })

    expect(partitionFileTab([placed]).bim).toEqual([placed])
  })

  it('drops map markers that belong to no building', () => {
    const marker = file({ id: 2, type: 'map-file', attachedFilesBuildingId: null })

    expect(Object.values(partitionFileTab([marker])).flat()).toEqual([])
  })

  it('drops user avatars', () => {
    const avatar = file({ id: 3, tag: 'user', extension: 'png', attachedFilesBuildingId: 4414 })

    expect(Object.values(partitionFileTab([avatar])).flat()).toEqual([])
  })
})
