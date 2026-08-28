// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { isRenderablePointCloud, selectPointCloudFiles } from './pointCloudFiles'

import type { DbFile } from '../../../../../types/dbTypes'

const file = (partial: Partial<DbFile>) => partial as DbFile

describe('isRenderablePointCloud', () => {
  it('accepts converted las and laz whatever the case', () => {
    expect(isRenderablePointCloud(file({ extension: 'LAZ', pointCloudPotreeConverted: true }))).toBe(true)
    expect(isRenderablePointCloud(file({ extension: 'las', pointCloudPotreeConverted: true }))).toBe(true)
  })

  it('rejects an unconverted cloud', () => {
    expect(isRenderablePointCloud(file({ extension: 'laz', pointCloudPotreeConverted: false }))).toBe(false)
    expect(isRenderablePointCloud(file({ extension: 'laz' }))).toBe(false)
  })

  it('rejects other extensions and files with none', () => {
    expect(isRenderablePointCloud(file({ extension: 'ifc', pointCloudPotreeConverted: true }))).toBe(false)
    expect(isRenderablePointCloud(file({ pointCloudPotreeConverted: true }))).toBe(false)
  })

  it('selects only the renderable clouds', () => {
    const files = [
      file({ id: 1, extension: 'laz', pointCloudPotreeConverted: true }),
      file({ id: 2, extension: 'laz', pointCloudPotreeConverted: false }),
      file({ id: 3, extension: 'ifc' }),
    ]
    expect(selectPointCloudFiles(files).map((f) => f.id)).toEqual([1])
  })
})
