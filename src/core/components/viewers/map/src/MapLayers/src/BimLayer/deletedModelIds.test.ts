// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { deletedModelIds } from './deletedModelIds'

import type { DbFile } from '../../../../../../../types/dbTypes'

const model = (id: number) => ({ bimFile: { id } as DbFile })

describe('deletedModelIds', () => {
  it('names a model whose file left the list', () => {
    expect(deletedModelIds([model(1), model(2)], new Set([1, 2]), new Set([1]))).toEqual(['2'])
  })

  it('keeps a model the list never held, such as one from another building', () => {
    expect(deletedModelIds([model(9)], new Set([1]), new Set([1]))).toEqual([])
  })

  it('keeps every model while the list is still unknown', () => {
    expect(deletedModelIds([model(1)], null, new Set())).toEqual([])
  })
})
