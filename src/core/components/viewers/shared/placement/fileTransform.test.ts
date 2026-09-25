// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { SourceUpAxis } from '../../../../types/dbTypes'
import { DEFAULT_PLACEMENT } from '../pointcloud/pointCloudPlacement'

import { fileTransformPatch, hasFileTransform, readFileTransform } from './fileTransform'

describe('hasFileTransform', () => {
  it('needs all three position columns', () => {
    expect(hasFileTransform({ fileTransformX: 0, fileTransformY: 0, fileTransformZ: 0 })).toBe(true)
    expect(hasFileTransform({ fileTransformX: 1, fileTransformY: 2, fileTransformZ: null })).toBe(false)
    expect(hasFileTransform({})).toBe(false)
  })
})

describe('readFileTransform', () => {
  it('fills null columns from the fallback, including its up axis', () => {
    const fallback = { ...DEFAULT_PLACEMENT, rotation: [0, 1, 0] as [number, number, number], sourceUp: 'y' as const }
    expect(readFileTransform({ fileTransformX: 5, fileRotationY: null }, fallback)).toEqual({
      position: [5, 0, 0],
      rotation: [0, 1, 0],
      scale: 1,
      sourceUp: 'y',
    })
  })

  it('ignores a non-positive or non-finite scale', () => {
    expect(readFileTransform({ fileScale: 0 }, DEFAULT_PLACEMENT).scale).toBe(1)
    expect(readFileTransform({ fileScale: Number.NaN }, DEFAULT_PLACEMENT).scale).toBe(1)
  })

  it('reads a stored up axis', () => {
    expect(readFileTransform({ fileSourceUp: SourceUpAxis.y }, DEFAULT_PLACEMENT).sourceUp).toBe('y')
  })
})

describe('fileTransformPatch', () => {
  it('writes only the parts of the placement it is given', () => {
    expect(fileTransformPatch({ position: [1, 2, 3] })).toEqual({ fileTransformX: 1, fileTransformY: 2, fileTransformZ: 3 })
    expect(fileTransformPatch({ scale: 2, sourceUp: 'z' })).toEqual({ fileScale: 2, fileSourceUp: 'z' })
    expect(fileTransformPatch({})).toEqual({})
  })
})
