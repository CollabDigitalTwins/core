// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { isBimFile, selectLoadableBimFiles } from './bimFilesToLoad'

import type { DbFile } from '../../../../../types/dbTypes'

const file = (overrides: Partial<DbFile>) =>
  ({ id: 1, name: 'a.frag', extension: 'frag', ...overrides }) as DbFile

describe('selectLoadableBimFiles', () => {
  it('loads only the files opted in on the record', () => {
    const files = [
      file({ id: 1, isVisible: true }),
      file({ id: 2, isVisible: false }),
      file({ id: 3, isVisible: undefined }),
    ]

    expect(selectLoadableBimFiles(files).map(f => f.id)).toEqual([1])
  })

  it('treats a null flag as hidden, so an un-migrated row does not load', () => {
    expect(selectLoadableBimFiles([file({ isVisible: null as never })])).toHaveLength(0)
  })

  it('leaves non-BIM files to their own sections', () => {
    const files = [file({ id: 1, extension: 'glb', isVisible: true }), file({ id: 2, isVisible: true })]

    expect(selectLoadableBimFiles(files).map(f => f.id)).toEqual([2])
  })

  it('accepts ifc and frag whatever the casing', () => {
    const files = [file({ id: 1, extension: 'IFC', isVisible: true }), file({ id: 2, extension: 'Frag', isVisible: true })]

    expect(selectLoadableBimFiles(files)).toHaveLength(2)
  })

  it('honours a session hide even while the record still says visible', () => {
    const files = [file({ id: 1, isVisible: true }), file({ id: 2, isVisible: true })]

    expect(selectLoadableBimFiles(files, { 1: { isVisible: false } }).map(f => f.id)).toEqual([2])
  })

  it('loads a file the session has not spoken about', () => {
    expect(selectLoadableBimFiles([file({ isVisible: true })], { 9: { isVisible: false } })).toHaveLength(1)
  })
})

describe('isBimFile', () => {
  it('separates fragments from everything else', () => {
    expect(isBimFile(file({ extension: 'frag' }))).toBe(true)
    expect(isBimFile(file({ extension: 'glb' }))).toBe(false)
    expect(isBimFile(file({ extension: null }))).toBe(false)
  })
})
