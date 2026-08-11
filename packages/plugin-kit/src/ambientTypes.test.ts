// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Checks `src/types/sdkModules.d.ts` with `skipLibCheck` off.
 *
 * Errors inside a `.d.ts` are invisible under `skipLibCheck: true`, which every
 * sensible project — including this one — turns on. That is a bad place for the
 * file whose whole job is to be a `.d.ts` shipped to other people: it compiles
 * clean here and breaks in a consumer's build.
 *
 * It has already happened once. An `import type … from './components'` inside an
 * ambient module is TS2439 ("cannot reference module through relative module
 * name"), the ambient types silently degraded to `any` for anyone with
 * `skipLibCheck` on, and nothing in this package noticed.
 *
 * The package cannot simply set `skipLibCheck: false`: the viewer libraries it
 * carries as type-only devDependencies do not compile clean on their own
 * (`maplibre-gl` alone wants `@types/geojson`). So the check is scoped to this one
 * file, and only diagnostics against this one file count.
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const AMBIENT = join(packageRoot, 'src/types/sdkModules.d.ts')

/** `typescript` is a devDependency here, but npm may have hoisted it. */
const TSC = [
  join(packageRoot, 'node_modules/typescript/bin/tsc'),
  join(packageRoot, '../../node_modules/typescript/bin/tsc'),
].find(candidate => existsSync(candidate))

const TSC_ARGS = [
  '--noEmit',
  '--strict',
  '--skipLibCheck', 'false',
  '--target', 'es2022',
  '--module', 'esnext',
  '--moduleResolution', 'bundler',
  '--lib', 'es2022,dom',
]

function diagnosticsAgainstAmbientFile(): string[] {
  if (!TSC) throw new Error('typescript not found')

  let output = ''

  try {
    execFileSync(process.execPath, [TSC, ...TSC_ARGS, AMBIENT], {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string }
    output = `${failure.stdout ?? ''}${failure.stderr ?? ''}`
  }

  return output
    .split(/\r?\n/)
    .filter(line => line.includes('sdkModules.d.ts('))
}

describe('ambient SDK module declarations', () => {
  it('has a compiler to check them with', () => {
    expect(TSC).toBeDefined()
  })

  it('compiles clean with skipLibCheck off, as a consumer would see it', () => {
    expect(diagnosticsAgainstAmbientFile().join('\n')).toBe('')
  }, 120_000)
})
