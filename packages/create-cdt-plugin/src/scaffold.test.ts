// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_KIT_SPEC, SURFACES } from './options'
import { scaffold } from './scaffold'
import { factsFor } from './surfaces'

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
        const composes = body === 'example' && factsFor(surface).usesReadoutRow

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
    const { directory } = await scaffold(optionsFor('viewer.legends', 'empty'), temp())
    const source = readFileSync(join(directory, 'src/components/RoomInventoryTool.tsx'), 'utf8')

    // Empty.tsx interpolates a props type the legend surface does not have, so routing it
    // here would emit `ToolbarToolProps & )`.
    expect(source).toContain('useLegend')
    expect(source).not.toContain('ToolbarToolProps')
  })

  it('gives the legend surface the legend entry point, not the toolbar one', async () => {
    const { directory } = await scaffold(optionsFor('viewer.legends', 'example'), temp())
    const entry = readFileSync(join(directory, 'src/index.ts'), 'utf8')

    expect(entry).toContain("ctx.register('viewer.legends'")
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
    expect((await read('viewer.legends')).devDependencies['@thatopen/components']).toBeUndefined()
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

  /** A temp directory that looks enough like core for built-in mode to run. */
  function fakeCore(): string {
    const root = temp()
    mkdirSync(join(root, 'src/core/plugins'), { recursive: true })
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@collabdt/core' }))

    writeFileSync(join(root, 'src/core/plugins/manifests.ts'), [
      "import helloBimManifest from './hello-bim/manifest.json'",
      "import helloMapManifest from './hello-map/manifest.json'",
      '',
      "import type { PluginManifest } from './sdk/types'",
      '',
      'export const PLUGIN_MANIFESTS: PluginManifest[] = [',
      '  helloMapManifest as PluginManifest,',
      '  helloBimManifest as PluginManifest,',
      ']',
      '',
    ].join('\n'))

    writeFileSync(join(root, 'src/core/plugins/installed.ts'), [
      'export const INSTALLED_PLUGINS: PluginSource[] = [',
      "  { manifest: manifestFor('hello-map'), entry: () => import('./hello-map') },",
      ']',
      '',
    ].join('\n'))

    return root
  }

  for (const surface of SURFACES) {
    for (const body of BODIES) {
      it(`writes the three-file built-in tree for ${surface} / ${body}`, async () => {
        const { directory, files } = await scaffold(
          { ...optionsFor(surface, body), mode: 'builtin' },
          fakeCore(),
        )

        const composes = body === 'example' && factsFor(surface).usesReadoutRow

        expect(files.sort()).toEqual([
          'components/RoomInventoryTool.tsx',
          ...(composes ? ['components/ReadoutRow.tsx'] : []),
          'index.ts',
          'manifest.json',
        ].sort())

        // No build files: a built-in plugin is compiled with core.
        expect(directory).toContain(join('src', 'core', 'plugins'))
        expect(files).not.toContain('package.json')
        expect(files).not.toContain('tsup.config.ts')
      })

      it(`imports only from ../sdk for ${surface} / ${body}`, async () => {
        const { directory, files } = await scaffold(
          { ...optionsFor(surface, body), mode: 'builtin' },
          fakeCore(),
        )

        for (const file of files.filter(name => name.endsWith('.ts') || name.endsWith('.tsx'))) {
          const source = readFileSync(join(directory, file), 'utf8')
          const specifiers = [...source.matchAll(/from '([^']+)'/g)].map(match => match[1])

          for (const specifier of specifiers) {
            // Core's isolation rule allows the SDK, the plugin's own files, and react.
            expect(specifier).toMatch(/^(\.\.\/)+sdk(\/|$)|^\.\/|^react$/)
          }
        }
      })
    }
  }

  it('registers the plugin in both files, since one alone loads nothing', async () => {
    const root = fakeCore()
    const { edited, snippets } = await scaffold(
      { ...optionsFor('map.tools', 'example'), mode: 'builtin' },
      root,
    )

    expect(snippets).toEqual([])
    expect(edited).toEqual(['src/core/plugins/manifests.ts', 'src/core/plugins/installed.ts'])

    const manifests = readFileSync(join(root, 'src/core/plugins/manifests.ts'), 'utf8')
    const installed = readFileSync(join(root, 'src/core/plugins/installed.ts'), 'utf8')

    expect(manifests).toContain("import roomInventoryManifest from './room-inventory/manifest.json'")
    expect(manifests).toContain('roomInventoryManifest as PluginManifest,')
    expect(installed).toContain("manifestFor('room-inventory'), entry: () => import('./room-inventory')")
  })

  it('prints snippets instead of guessing when a registration file is unrecognisable', async () => {
    const root = fakeCore()
    writeFileSync(join(root, 'src/core/plugins/installed.ts'), 'export const SOMETHING_ELSE = []\n')

    const { edited, snippets } = await scaffold(
      { ...optionsFor('map.tools', 'example'), mode: 'builtin' },
      root,
    )

    expect(edited).toEqual(['src/core/plugins/manifests.ts'])
    expect(snippets).toHaveLength(1)
    expect(snippets[0]).toContain('installed.ts')
    expect(snippets[0]).toContain("manifestFor('room-inventory')")

    // The unrecognised file is left exactly as it was rather than half-edited.
    expect(readFileSync(join(root, 'src/core/plugins/installed.ts'), 'utf8'))
      .toBe('export const SOMETHING_ELSE = []\n')
  })

  it('reports a missing registration file rather than throwing', async () => {
    const root = temp()
    mkdirSync(join(root, 'src/core/plugins'), { recursive: true })
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@collabdt/core' }))

    const { snippets } = await scaffold(
      { ...optionsFor('map.tools', 'empty'), mode: 'builtin' },
      root,
    )

    expect(snippets).toHaveLength(2)
    expect(snippets.join('\n')).toContain('not found')
  })

  it('leaves external mode alone, editing nothing in core', async () => {
    const { edited, snippets } = await scaffold(optionsFor('map.tools', 'example'), temp())

    expect(edited).toEqual([])
    expect(snippets).toEqual([])
  })
})
