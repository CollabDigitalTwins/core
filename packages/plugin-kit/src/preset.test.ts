// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { PLUGIN_EXTERNALS } from './externals'
import { pluginPreset } from './preset'

describe('pluginPreset', () => {
  it('emits a single ESM file, because the host serves exactly one file per plugin', () => {
    const config = pluginPreset()

    expect(config.format).toEqual(['esm'])
    expect(config.splitting).toBe(false)
    expect(config.entry).toEqual(['src/index.ts'])
    expect(config.outDir).toBe('dist')
  })

  it('marks every host specifier external', () => {
    expect(pluginPreset().external).toEqual([...PLUGIN_EXTERNALS])
  })

  it('requests the metafile the import guard reads', () => {
    expect(pluginPreset().metafile).toBe(true)
  })

  it('lets an author override a field without losing the externals', () => {
    const config = pluginPreset({ minify: true })

    expect(config.minify).toBe(true)
    expect(config.external).toEqual([...PLUGIN_EXTERNALS])
  })

  it('refuses an override that would break the delivery contract', () => {
    expect(() => pluginPreset({ splitting: true })).toThrow(/single file/i)
    expect(() => pluginPreset({ format: ['cjs'] })).toThrow(/ESM/i)
  })

  it('refuses an override that would switch the import guard off', () => {
    expect(() => pluginPreset({ onSuccess: 'echo hi' })).toThrow(/import guard/i)
    expect(() => pluginPreset({ external: [] })).toThrow(/import guard/i)
  })
})
