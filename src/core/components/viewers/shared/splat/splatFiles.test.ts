// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { SPLAT_ACCEPT, SPLAT_EXTENSIONS, isSplatExtension, isSplatFile } from './splatFiles'

import type { DbFile } from '../../../../types/dbTypes'

const file = (partial: Partial<DbFile>) => partial as DbFile

describe('isSplatExtension', () => {
  it('accepts every format Spark loads, whatever the case', () => {
    expect(isSplatExtension('ply')).toBe(true)
    expect(isSplatExtension('SPZ')).toBe(true)
    expect(isSplatExtension('splat')).toBe(true)
    expect(isSplatExtension('KSplat')).toBe(true)
    expect(isSplatExtension('sog')).toBe(true)
  })

  it('rejects nothing-like input', () => {
    expect(isSplatExtension(null)).toBe(false)
    expect(isSplatExtension(undefined)).toBe(false)
    expect(isSplatExtension('')).toBe(false)
  })

  it('rejects point cloud and model extensions', () => {
    for (const extension of ['laz', 'las', 'copc', 'e57', 'glb', 'gltf', 'ifc']) {
      expect(isSplatExtension(extension)).toBe(false)
    }
  })
})

describe('isSplatFile', () => {
  it('accepts a record carrying either the stored type or the extension', () => {
    expect(isSplatFile(file({ type: 'splat-file' }))).toBe(true)
    expect(isSplatFile(file({ extension: 'spz' }))).toBe(true)
    expect(isSplatFile(file({ type: 'SPLAT-FILE' }))).toBe(true)
  })

  it('rejects a record with neither', () => {
    expect(isSplatFile(file({ type: 'point-cloud-file', extension: 'laz' }))).toBe(false)
    expect(isSplatFile(file({}))).toBe(false)
  })
})

describe('accept list', () => {
  it('offers one entry per supported extension', () => {
    const offered = SPLAT_ACCEPT.split(',')
    expect(offered).toHaveLength(SPLAT_EXTENSIONS.length)
    for (const extension of SPLAT_EXTENSIONS) expect(offered).toContain(`.${extension}`)
  })
})
