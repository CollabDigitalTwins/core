// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { IdsIcon } from '../components/ui/Icons/'

import { getFileIcon } from './getFileIcon'

import type { DbFile } from '../types/dbTypes'

const record = (partial: Partial<DbFile>) => partial as DbFile

describe('getFileIcon', () => {
  it('gives an extension-less converted point cloud the point-cloud icon', () => {
    expect(getFileIcon(record({ type: 'point-cloud-file' }))).toBe(LR.Grip)
  })

  it('recognizes an e57 point cloud', () => {
    expect(getFileIcon(record({ extension: 'e57' }))).toBe(LR.Grip)
  })

  it('still recognizes a laz point cloud', () => {
    expect(getFileIcon(record({ extension: 'laz' }))).toBe(LR.Grip)
  })

  it('still recognizes an ids file', () => {
    expect(getFileIcon(record({ extension: 'ids' }))).toBe(IdsIcon)
  })

  it('distinguishes video within media-file', () => {
    expect(getFileIcon(record({ extension: 'mp4' }))).toBe(LR.Video)
  })

  it('distinguishes a spreadsheet within document-file', () => {
    expect(getFileIcon(record({ extension: 'xlsx' }))).toBe(LR.Table)
  })

  it('falls back to the generic icon for anything unrecognized', () => {
    expect(getFileIcon(record({ extension: 'wat' }))).toBe(LR.File)
  })
})
