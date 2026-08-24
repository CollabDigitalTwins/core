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
  name: 'Room Inventory',
  slug: 'room-inventory',
  surfaces: [surface],
  body,
  author: 'Nico',
  description: 'Counts rooms.',
  yes: true,
  kitSpec: DEFAULT_KIT_SPEC,
})

const BODIES: Body[] = ['example', 'empty']

describe('scaffold', () => {
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

describe('scaffold, spanning several surfaces', () => {
  const spanning = (surfaces: Surface[], body: Body = 'example'): Options => ({
    ...optionsFor('map.tools', body),
    surfaces,
  })

  const read = (directory: string, file: string) =>
    readFileSync(join(directory, file), 'utf8')

  it('declares every chosen capability in the manifest', async () => {
    const { directory } = await scaffold(
      spanning(['bim.tools', 'viewer.tabs', 'viewer.legends']),
      temp(),
    )

    const manifest = JSON.parse(read(directory, 'manifest.json')) as { capabilities: string[] }

    expect(manifest.capabilities).toEqual(['bim.tools', 'viewer.tabs', 'viewer.legends'])
  })

  it('registers every chosen capability from one activate', async () => {
    const { directory } = await scaffold(spanning(['bim.tools', 'viewer.tabs']), temp())
    const entry = read(directory, 'src/index.ts')

    expect(entry).toContain("ctx.register('bim.tools'")
    expect(entry).toContain("ctx.register('viewer.tabs'")
    expect(entry.match(/export function activate/g)).toHaveLength(1)
  })

  it('gives each surface its own body file, so two never collide on one name', async () => {
    const { files } = await scaffold(spanning(['bim.tools', 'viewer.tabs']), temp())

    expect(files).toContain('src/components/RoomInventoryBim.tsx')
    expect(files).toContain('src/components/RoomInventoryTab.tsx')
  })

  it('writes ReadoutRow once, however many toolbars are chosen', async () => {
    const { files } = await scaffold(spanning(['map.tools', 'bim.tools']), temp())

    expect(files.filter(file => file.endsWith('ReadoutRow.tsx'))).toHaveLength(1)
  })

  it('omits ReadoutRow when no chosen surface composes it', async () => {
    const { files } = await scaffold(spanning(['viewer.tabs', 'ui.dialogs']), temp())

    expect(files.some(file => file.endsWith('ReadoutRow.tsx'))).toBe(false)
  })

  it('unions the type dependencies and keeps devDependencies sorted', async () => {
    const { directory } = await scaffold(spanning(['map.tools', 'bim.tools']), temp())
    const parsed = JSON.parse(read(directory, 'package.json')) as {
      devDependencies: Record<string, string>
    }
    const names = Object.keys(parsed.devDependencies)

    expect(names).toContain('maplibre-gl')
    expect(names).toContain('@thatopen/components')
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  // The case an intersection of the kit's per-surface aliases cannot express: the second
  // viewer's component would be checked against a registration bound to `unknown`.
  it('binds one context slot per viewer rather than intersecting aliases', async () => {
    const { directory } = await scaffold(spanning(['map.tools', 'bim.tools']), temp())

    expect(read(directory, 'src/index.ts'))
      .toContain('type Ctx = PluginContext<MapToolProps, BimToolProps>')
  })

  it('stops the context declaration at the last bound slot', async () => {
    const { directory } = await scaffold(spanning(['map.tools', 'viewer.tabs']), temp())

    expect(read(directory, 'src/index.ts')).toContain('type Ctx = PluginContext<MapToolProps>')
  })

  it('leaves unused slots unknown so a later one can still be bound', async () => {
    const { directory } = await scaffold(spanning(['bim.tools', 'viewer.legends']), temp())

    expect(read(directory, 'src/index.ts'))
      .toContain('type Ctx = PluginContext<unknown, BimToolProps, unknown, LegendRegistration>')
  })

  it('targets a tab at the viewers the plugin actually contributes tools to', async () => {
    const { directory } = await scaffold(spanning(['bim.tools', 'viewer.tabs']), temp())

    expect(read(directory, 'src/index.ts')).toContain("viewers: ['bim']")
  })

  it('targets a legend the same way, from the same surfaces', async () => {
    const { directory } = await scaffold(spanning(['map.tools', 'viewer.legends']), temp())

    expect(read(directory, 'src/index.ts')).toContain("viewers: ['map']")
  })

  it('leaves no unrendered token anywhere it writes', async () => {
    const { directory, files } = await scaffold(
      spanning(['map.tools', 'bim.tools', 'viewer.tabs', 'viewer.legends', 'ui.dialogs']),
      temp(),
    )

    for (const file of files) {
      expect(read(directory, file)).not.toMatch(/\{\{[A-Z_]+\}\}/)
    }
  })

  it('refuses to write anything when no surface was chosen', async () => {
    await expect(scaffold(spanning([]), temp())).rejects.toThrow(/at least one surface/)
  })

})

describe('the scaffolded manifest icon', () => {
  for (const surface of SURFACES) {
    it(`carries the icon this surface implies for ${surface}`, async () => {
      const { directory } = await scaffold(optionsFor(surface, 'example'), temp())
      const manifest = JSON.parse(
        readFileSync(join(directory, 'manifest.json'), 'utf8'),
      ) as { icon: string }

      expect(manifest.icon).toBe(factsFor(surface).icon)
    })
  }

  // The Plugins page resolves the name against lucide and shows a puzzle piece on a miss, so
  // a name that is not an icon degrades quietly rather than visibly.
  it('names a lucide icon rather than an arbitrary string', async () => {
    const { directory } = await scaffold(optionsFor('viewer.legends', 'example'), temp())
    const manifest = JSON.parse(
      readFileSync(join(directory, 'manifest.json'), 'utf8'),
    ) as { icon: string }

    expect(manifest.icon).toMatch(/^[A-Z][A-Za-z]+$/)
  })

  it('takes the first surface when the plugin spans several', async () => {
    const { directory } = await scaffold(
      { ...optionsFor('bim.tools', 'example'), surfaces: ['bim.tools', 'viewer.tabs'] },
      temp(),
    )
    const manifest = JSON.parse(
      readFileSync(join(directory, 'manifest.json'), 'utf8'),
    ) as { icon: string }

    expect(manifest.icon).toBe(factsFor('bim.tools').icon)
  })
})
