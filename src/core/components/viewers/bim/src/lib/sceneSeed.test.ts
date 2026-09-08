// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { selectSceneSeedFiles } from './sceneSeed'

const placeable = (extension?: string | null) => extension === 'glb' || extension === 'dxf'
const empty = () => false

const file = (overrides: Partial<{ id: number; extension: string | null; isVisible: boolean }>) =>
  ({ id: 1, extension: 'glb', isVisible: true, ...overrides })

describe('selectSceneSeedFiles', () => {
  it('seeds the files opted in on the record', () => {
    const files = [file({ id: 1 }), file({ id: 2, isVisible: false })]

    expect(selectSceneSeedFiles(files, placeable, empty).map(f => f.id)).toEqual([1])
  })

  it('skips a kind that cannot hold a place, such as a PDF', () => {
    const files = [file({ id: 1, extension: 'pdf' }), file({ id: 2, extension: 'dxf' })]

    expect(selectSceneSeedFiles(files, placeable, empty).map(f => f.id)).toEqual([2])
  })

  it('leaves alone whatever is already in the scene, so a revalidation cannot double-load', () => {
    const files = [file({ id: 1 }), file({ id: 2 })]

    expect(selectSceneSeedFiles(files, placeable, key => key === '1').map(f => f.id)).toEqual([2])
  })

  it('treats a missing flag as not opted in', () => {
    expect(selectSceneSeedFiles([file({ isVisible: undefined })], placeable, empty)).toHaveLength(0)
  })
})
