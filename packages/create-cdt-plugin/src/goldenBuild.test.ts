// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// The test that proves the deliverable. Everything else asserts that files were written
// correctly; this one installs a scaffolded plugin for real, typechecks it, builds it, and
// checks what came out.

import { execFile } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { afterAll, describe, expect, it } from 'vitest'

import { PLUGIN_EXTERNALS } from '../../plugin-kit/src/externals'

import { scaffold } from './scaffold'

import type { Options } from './options'

const run = promisify(execFile)
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Forward slashes: npm accepts them on Windows too, and it keeps the `file:` specifier free
// of backslashes independently of the JSON escaping in tokensFor.
const kitPath = join(packageRoot, '../plugin-kit').replace(/\\/g, '/')

const options: Options = {
  mode: 'external',
  name: 'Room Inventory',
  slug: 'room-inventory',
  surfaces: ['map.tools'],
  body: 'example',
  author: 'Nico',
  description: 'Counts rooms.',
  yes: true,
  // A file: specifier so this runs before the kit is published. A real author gets
  // DEFAULT_KIT_SPEC instead.
  kitSpec: `file:${kitPath}`,
}

interface Built {
  directory: string
  stdout: string
}

/**
 * Scaffold, install, build.
 *
 * `extraSource` is appended to the entry and `extraDeps` merged into the manifest, which is
 * how the dirty case gets a *resolvable* `three` to bundle. Without the dependency esbuild
 * fails on module resolution before the guard ever runs, the build fails for the wrong
 * reason, and the test passes while proving nothing.
 */
// Each case installs a full node_modules, so leaving them behind fills the disk and the next
// run fails with ENOSPC somewhere unrelated.
const roots: string[] = []

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

async function build(
  overrides: Partial<Options> = {},
  extraSource = '',
  extraDeps: Record<string, string> = {},
): Promise<Built> {
  const root = mkdtempSync(join(tmpdir(), 'cdt-golden-'))
  roots.push(root)
  const { directory } = await scaffold({ ...options, ...overrides }, root)

  if (extraSource) {
    const entry = join(directory, 'src/index.ts')
    writeFileSync(entry, `${readFileSync(entry, 'utf8')}\n${extraSource}`, 'utf8')
  }

  if (Object.keys(extraDeps).length > 0) {
    const manifest = join(directory, 'package.json')
    const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as {
      devDependencies: Record<string, string>
    }
    parsed.devDependencies = { ...parsed.devDependencies, ...extraDeps }
    writeFileSync(manifest, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8')
  }

  await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: directory, shell: true })

  const { stdout } = await run('npm', ['run', 'build'], { cwd: directory, shell: true })

  return { directory, stdout }
}

describe('a scaffolded plugin', () => {
  it('collapses its two source components into a single ESM file', async () => {
    const { directory } = await build()

    // Two source files in, one out. This is the delivery contract being exercised rather
    // than asserted: the example composes ReadoutRow from its own file, and a code-split
    // chunk beside index.js would not resolve when the platform served it.
    expect(readdirSync(join(directory, 'src/components')).sort())
      .toEqual(['ReadoutRow.tsx', 'RoomInventoryTool.tsx'])

    const dist = join(directory, 'dist')

    expect(readdirSync(dist).filter(name => name.endsWith('.js'))).toEqual(['index.js'])

    const source = readFileSync(join(dist, 'index.js'), 'utf8')

    // The child's markup has to be *in* the bundle, not merely absent as a chunk.
    expect(source).toContain('tabular-nums')
  }, 600_000)

  it('imports only what the platform publishes a shim for', async () => {
    const { directory } = await build()
    const source = readFileSync(join(directory, 'dist/index.js'), 'utf8')

    const specifiers = [...source.matchAll(/from\s*["']([^"']+)["']/g)].map(match => match[1])

    expect(specifiers.length).toBeGreaterThan(0)

    for (const specifier of specifiers) {
      expect(PLUGIN_EXTERNALS).toContain(specifier)
    }
  }, 600_000)

  it('typechecks against the kit types with no @collabdt/core installed', async () => {
    const { directory } = await build()

    expect(readdirSync(join(directory, 'node_modules/@collabdt'))).not.toContain('core')

    await run('npx', ['tsc', '--noEmit'], { cwd: directory, shell: true })
  }, 600_000)

  it('builds every surface, not just the map', async () => {
    for (const surface of ['bim.tools', 'pointcloud.tools', 'viewer.legends'] as const) {
      const { directory } = await build({ surfaces: [surface] })

      expect(readdirSync(join(directory, 'dist')).filter(f => f.endsWith('.js'))).toEqual(['index.js'])
    }
  }, 900_000)

  it('builds and typechecks a plugin spanning several surfaces', async () => {
    const { directory } = await build({ surfaces: ['bim.tools', 'viewer.tabs', 'viewer.legends'] })

    expect(readdirSync(join(directory, 'dist')).filter(f => f.endsWith('.js'))).toEqual(['index.js'])

    await run('npx', ['tsc', '--noEmit'], { cwd: directory, shell: true })
  }, 900_000)

  // Two viewers is the case an intersection of the kit's per-surface context aliases cannot
  // express: the second viewer's component would be checked against ToolbarRegistration<unknown>.
  it('binds one context slot per viewer, so each component keeps its own props', async () => {
    const { directory } = await build({ surfaces: ['map.tools', 'bim.tools'] })

    expect(readFileSync(join(directory, 'src/index.ts'), 'utf8'))
      .toContain('PluginContext<MapToolProps, BimToolProps>')

    await run('npx', ['tsc', '--noEmit'], { cwd: directory, shell: true })
  }, 900_000)

  it('fails the build when the plugin bundles three, naming it', async () => {
    // `three` is a real installed dependency here, so esbuild resolves and inlines it. The
    // guard's bundled-package check is what must reject this, not a resolution error.
    const attempt = build(
      {},
      "import * as THREE from 'three'\nexport const version = THREE.REVISION\n",
      { three: '^0.170.0' },
    )

    await expect(attempt).rejects.toThrow(/three/)

    // Assert on the guard's own wording, so a resolution failure cannot pass for a guard
    // failure. Both mention "three"; only one is the thing this package exists to do. The
    // phrase below is the bundled-package check specifically, not the external-import one.
    await expect(attempt).rejects.toThrow(/inlined into the bundle/)
  }, 600_000)
})
