// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { SPLAT_ACCEPT, SPLAT_EXTENSIONS, claimSplatIds, isSplatExtension, isSplatFile, splatFileType } from './splatFiles'

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

describe('splatFileType', () => {
  it('names the decoder for every supported extension', () => {
    expect(splatFileType('ply')).toBe('ply')
    expect(splatFileType('spz')).toBe('spz')
    expect(splatFileType('splat')).toBe('splat')
    expect(splatFileType('ksplat')).toBe('ksplat')
  })

  it('maps sog to the zipped PCSOGS decoder Spark uses for that extension', () => {
    expect(splatFileType('sog')).toBe('pcsogszip')
  })

  it('ignores case, since the extension column is whatever the upload carried', () => {
    expect(splatFileType('PLY')).toBe('ply')
    expect(splatFileType('SOG')).toBe('pcsogszip')
  })

  it('returns undefined for anything Spark cannot decode', () => {
    expect(splatFileType('laz')).toBeUndefined()
    expect(splatFileType(null)).toBeUndefined()
    expect(splatFileType(undefined)).toBeUndefined()
  })
})

describe('claimSplatIds', () => {
  const ply = (id: number, isVisible?: boolean) => file({ id, extension: 'ply', isVisible })

  it('returns the visible splats on a first pass', () => {
    expect(claimSplatIds([ply(1, true), ply(2, false), ply(3, true)], new Set())).toEqual(['1', '3'])
  })

  it('ignores files Spark cannot render', () => {
    expect(claimSplatIds([file({ id: 1, extension: 'ifc', isVisible: true })], new Set())).toEqual([])
  })

  it('returns a splat that appears after the first pass', () => {
    const seen = new Set<string>()
    claimSplatIds([ply(1, true)], seen)
    expect(claimSplatIds([ply(1, true), ply(2, true)], seen)).toEqual(['2'])
  })

  it('never returns a splat twice, so a switched-off one stays off', () => {
    const seen = new Set<string>()
    claimSplatIds([ply(1, true)], seen)
    expect(claimSplatIds([ply(1, true)], seen)).toEqual([])
  })

  it('claims a hidden splat too, so turning it on later stays the decision of the user', () => {
    const seen = new Set<string>()
    claimSplatIds([ply(1, false)], seen)
    expect(claimSplatIds([ply(1, true)], seen)).toEqual([])
  })
})
