// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { partitionFileTab } from './src/partitionFileTab'

import type { DbFile } from '../../../../../../../types/dbTypes'

const file = (partial: Partial<DbFile>) => ({ id: 1, name: 'f', ...partial }) as DbFile

describe('partitionFileTab', () => {
  it('files each family into its own section', () => {
    const buckets = partitionFileTab([
      file({ id: 1, extension: 'ifc' }),
      file({ id: 2, extension: 'frag' }),
      file({ id: 3, extension: 'glb' }),
      file({ id: 4, extension: 'laz' }),
      file({ id: 5, extension: 'dxf' }),
      file({ id: 6, extension: 'pdf' }),
    ])
    expect(buckets.bim.map(f => f.id)).toEqual([1, 2])
    expect(buckets.models.map(f => f.id)).toEqual([3])
    expect(buckets.pointClouds.map(f => f.id)).toEqual([4])
    expect(buckets.files.map(f => f.id)).toEqual([5, 6])
  })

  it('rescues a point cloud the old upload path mis-stamped as bim-file', () => {
    const buckets = partitionFileTab([file({ id: 9, type: 'bim-file', extension: 'laz' })])
    expect(buckets.pointClouds.map(f => f.id)).toEqual([9])
    expect(buckets.bim).toEqual([])
  })

  it('rescues a document the old upload path mis-stamped as bim-file', () => {
    const buckets = partitionFileTab([file({ id: 10, type: 'bim-file', extension: 'pdf' })])
    expect(buckets.files.map(f => f.id)).toEqual([10])
    expect(buckets.bim).toEqual([])
  })

  it('leaves a map file out of every BIM section', () => {
    const buckets = partitionFileTab([file({ id: 11, type: 'map-file', extension: 'geojson' })])
    expect(Object.values(buckets).flat()).toEqual([])
  })

  it('leaves a user avatar out of every section', () => {
    const buckets = partitionFileTab([file({ id: 12, tag: 'user', extension: 'png' })])
    expect(Object.values(buckets).flat()).toEqual([])
  })
})
