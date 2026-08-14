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
    // A brace glob, not a fixed name: tsup globs an array entry, and a plugin
    // written in JSX has a .tsx entry that a literal 'src/index.ts' never matches.
    expect(config.entry).toEqual(['src/index.{ts,tsx}'])
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

  it('accepts `format` as a bare string, since Options.format is `Format[] | Format`', () => {
    expect(() => pluginPreset({ format: 'esm' })).not.toThrow()
    expect(() => pluginPreset({ format: ['esm'] })).not.toThrow()
  })

  it('refuses `format` overrides that are not exactly esm, string or array', () => {
    expect(() => pluginPreset({ format: 'cjs' })).toThrow(/ESM/i)
    expect(() => pluginPreset({ format: ['esm', 'cjs'] })).toThrow(/ESM/i)
  })

  it('refuses `outDir` and `entry` overrides, since PLUGIN_METAFILE/PLUGIN_OUT_FILE are hardcoded to dist/', () => {
    expect(() => pluginPreset({ outDir: 'build' })).toThrow(/dist\/index\.js/i)
    expect(() => pluginPreset({ entry: ['src/main.ts'] })).toThrow(/dist\/index\.js/i)
  })
})
