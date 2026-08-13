// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_KIT_SPEC, SURFACES } from './options'
import { scaffold } from './scaffold'

import type { Body, Options, Surface } from './options'

// Deliberately no import of core here. Validating a generated manifest with core's real
// `validateManifest` is worth doing, but importing core pulls its whole type graph into this
// package's `tsc` run, and core does not compile clean in isolation. That assertion lives in
// core instead: src/core/plugins/host/createCdtPluginDrift.test.ts, which is also the repo
// where a change to the validator would be made.

const temp = () => mkdtempSync(join(tmpdir(), 'cdt-scaffold-'))

const optionsFor = (surface: Surface, body: Body): Options => ({
  mode: 'external',
  name: 'Room Inventory',
  slug: 'room-inventory',
  surface,
  body,
  author: 'Nico',
  description: 'Counts rooms.',
  yes: true,
  kitSpec: DEFAULT_KIT_SPEC,
})

const BODIES: Body[] = ['example', 'empty']

describe('scaffold, external mode', () => {
  for (const surface of SURFACES) {
    for (const body of BODIES) {
      it(`writes a parseable manifest declaring ${surface} / ${body}`, async () => {
        const { directory } = await scaffold(optionsFor(surface, body), temp())

        const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')) as {
          capabilities: string[]
          hostApi: number
          version: string
        }

        expect(manifest.capabilities).toEqual([surface])
        expect(manifest.hostApi).toBe(1)
        expect(manifest.version).toBeTruthy()
      })

      it(`names the folder exactly the manifest slug for ${surface} / ${body}`, async () => {
        const { directory } = await scaffold(optionsFor(surface, body), temp())

        const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'))

        // The scanner requires these agree and skips the folder with only a log line
        // otherwise, so a mismatch is a plugin that silently never appears.
        expect(manifest.slug).toBe(directory.split(/[\\/]/).pop())
      })

      it(`writes the full buildable file set for ${surface} / ${body}`, async () => {
        const { files } = await scaffold(optionsFor(surface, body), temp())

        // The example body is deliberately two components in two files, so a reader does
        // not infer from the single-file bundle that a plugin is one component. The legend
        // has no empty variant: its hook is the plugin.
        const composes = body === 'example' && surface !== 'map.legends'

        expect(files.sort()).toEqual([
          '.gitignore',
          'README.md',
          'manifest.json',
          'package.json',
          'src/components/RoomInventoryTool.tsx',
          ...(composes ? ['src/components/ReadoutRow.tsx'] : []),
          'src/index.ts',
          'tsconfig.json',
          'tsup.config.ts',
        ].sort())
      })

      it(`leaves no unrendered token for ${surface} / ${body}`, async () => {
        const { directory, files } = await scaffold(optionsFor(surface, body), temp())

        for (const file of files) {
          expect(readFileSync(join(directory, file), 'utf8')).not.toMatch(/\{\{[A-Z_]+\}\}/)
        }
      })
    }
  }

  it('never routes the legend surface at the empty template, which cannot render for it', async () => {
    const { directory } = await scaffold(optionsFor('map.legends', 'empty'), temp())
    const source = readFileSync(join(directory, 'src/components/RoomInventoryTool.tsx'), 'utf8')

    // Empty.tsx interpolates a props type the legend surface does not have, so routing it
    // here would emit `ToolbarToolProps & )`.
    expect(source).toContain('useLegend')
    expect(source).not.toContain('ToolbarToolProps')
  })

  it('gives the legend surface the legend entry point, not the toolbar one', async () => {
    const { directory } = await scaffold(optionsFor('map.legends', 'example'), temp())
    const entry = readFileSync(join(directory, 'src/index.ts'), 'utf8')

    expect(entry).toContain("ctx.register('map.legends'")
    expect(entry).not.toMatch(/^\s*component:/m)
  })

  it('adds the type-only dependency only where the surface needs one', async () => {
    const read = async (surface: Surface) => {
      const { directory } = await scaffold(optionsFor(surface, 'example'), temp())

      return JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as {
        devDependencies: Record<string, string>
      }
    }

    expect((await read('map.tools')).devDependencies['maplibre-gl']).toBeDefined()
    expect((await read('bim.tools')).devDependencies['@thatopen/components']).toBeDefined()
    expect((await read('pointcloud.tools')).devDependencies['maplibre-gl']).toBeUndefined()
    expect((await read('map.legends')).devDependencies['@thatopen/components']).toBeUndefined()
  })

  it('keeps devDependencies key-sorted, so the spliced entry does not land arbitrarily', async () => {
    const { directory } = await scaffold(optionsFor('map.tools', 'example'), temp())
    const parsed = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as {
      devDependencies: Record<string, string>
    }

    const keys = Object.keys(parsed.devDependencies)

    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)))
  })

  it('writes .gitignore with the leading dot, though the template is stored without it', async () => {
    const { directory, files } = await scaffold(optionsFor('map.tools', 'example'), temp())

    expect(files).toContain('.gitignore')
    expect(files).not.toContain('gitignore')
    expect(readFileSync(join(directory, '.gitignore'), 'utf8')).toContain('dist/')
  })

  it('writes into ./plugins/<slug> when a plugins folder is already there', async () => {
    const root = temp()
    const { mkdirSync } = await import('node:fs')
    mkdirSync(join(root, 'plugins'))

    const { directory } = await scaffold(optionsFor('map.tools', 'example'), root)

    expect(directory).toBe(join(root, 'plugins', 'room-inventory'))
  })

  it('refuses a non-empty target rather than merging into it', async () => {
    const root = temp()
    await scaffold(optionsFor('map.tools', 'example'), root)

    await expect(scaffold(optionsFor('map.tools', 'example'), root)).rejects.toThrow(/not empty/)
  })

  it('refuses a slug that collides with a compiled-in plugin', async () => {
    await expect(
      scaffold({ ...optionsFor('map.tools', 'example'), slug: 'hello-map' }, temp()),
    ).rejects.toThrow(/compiled into/)
  })

  it('refuses an unusable slug', async () => {
    await expect(
      scaffold({ ...optionsFor('map.tools', 'example'), slug: 'Room Inventory' }, temp()),
    ).rejects.toThrow(/lowercase/)
  })

  it('writes nothing at all when a refusal fires', async () => {
    const root = temp()
    const { readdirSync } = await import('node:fs')

    await expect(
      scaffold({ ...optionsFor('map.tools', 'example'), slug: 'hello-map' }, root),
    ).rejects.toThrow()

    expect(readdirSync(root)).toEqual([])
  })
})

describe('scaffold, built-in mode', () => {
  it('refuses built-in mode outside @collabdt/core', async () => {
    await expect(
      scaffold({ ...optionsFor('map.tools', 'example'), mode: 'builtin' }, temp()),
    ).rejects.toThrow(/@collabdt\/core/)
  })

  it('checks the package rather than the folder name', async () => {
    const root = temp()
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'cdt-na' }))

    await expect(
      scaffold({ ...optionsFor('map.tools', 'example'), mode: 'builtin' }, root),
    ).rejects.toThrow(/@collabdt\/core/)
  })
})
