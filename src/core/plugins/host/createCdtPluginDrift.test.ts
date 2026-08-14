// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { SURFACES } from '../../../../packages/create-cdt-plugin/src/options'
import { scaffold } from '../../../../packages/create-cdt-plugin/src/scaffold'
import { COMPILED_IN_SLUGS } from '../../../../packages/create-cdt-plugin/src/target'
import { PLUGIN_MANIFESTS } from '../manifests'
import { VALID_CAPABILITIES, validateManifest } from '../sdk/types'
import { PLUGIN_HOST_API } from '../sdk/version'

/**
 * `create-cdt-plugin` is a `bin` run by plain Node, which cannot resolve core's
 * extensionless dist imports, so it keeps checked copies of three facts rather than
 * importing them. This is what stops them diverging — the breaking change fails here, in
 * core, where it was made.
 *
 * The manifest validation below is here for the mirror reason: importing core from the
 * scaffolder's own test would pull core's whole type graph into that package's `tsc` run.
 * Core's vitest bundles, so it can import the scaffolder where the reverse fails.
 */
describe('create-cdt-plugin', () => {
  it('knows every plugin compiled into core, so it can refuse a colliding slug', () => {
    expect([...COMPILED_IN_SLUGS].sort()).toEqual(PLUGIN_MANIFESTS.map(m => m.slug).sort())
  })

  it('only offers capabilities core recognises', () => {
    for (const surface of SURFACES) {
      expect(VALID_CAPABILITIES).toContain(surface)
    }
  })

  it('offers no capability that nothing renders', () => {
    // Valid in the schema, never scaffolded: a plugin registering one shows nothing.
    expect(SURFACES).not.toContain('sidebar.items')
    expect(SURFACES).not.toContain('viewer.panels')
  })

  it('stamps every generated manifest with the host API core enforces', () => {
    const render = readFileSync(
      join(process.cwd(), 'packages/create-cdt-plugin/src/render.ts'),
      'utf8',
    )

    expect(render).toContain(`HOST_API: '${PLUGIN_HOST_API}'`)
  })
})

describe('a scaffolded manifest', () => {
  for (const surface of SURFACES) {
    it(`passes core's own validateManifest for ${surface}`, async () => {
      const root = mkdtempSync(join(tmpdir(), 'cdt-drift-'))

      const { directory } = await scaffold({
        mode: 'external',
        name: 'Room Inventory',
        slug: 'room-inventory',
        surface,
        body: 'example',
        author: 'Nico',
        description: 'Counts rooms.',
        yes: true,
        kitSpec: '^0.1.0',
      }, root)

      const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'))
      const result = validateManifest(manifest)

      expect(result.errors).toEqual([])
      expect(result.valid).toBe(true)
    })
  }

  it('declares a hostApi core will accept rather than warn about', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cdt-drift-'))

    const { directory } = await scaffold({
      mode: 'external',
      name: 'Room Inventory',
      slug: 'room-inventory',
      surface: 'map.tools',
      body: 'empty',
      author: 'Nico',
      description: 'Counts rooms.',
      yes: true,
      kitSpec: '^0.1.0',
    }, root)

    const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')) as {
      hostApi: number
    }

    // Omitting hostApi is only warned about, deferring an incompatibility to render time.
    // A scaffolded plugin should not start there.
    expect(manifest.hostApi).toBe(PLUGIN_HOST_API)
  })
})
