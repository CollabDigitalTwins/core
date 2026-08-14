// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Checks everything under `src/types/` with `skipLibCheck` off, because errors inside a
// `.d.ts` are invisible under the `skipLibCheck: true` every sensible project turns on —
// a bad place for the files whose whole job is to be shipped to other people as types.
//
// It has already happened once: an `import type … from './components'` inside an ambient
// module is TS2439 ("cannot reference module through relative module name"), the ambient
// types silently degraded to `any` for everyone with `skipLibCheck` on, and nothing here
// noticed.
//
// The package cannot simply set `skipLibCheck: false` — its type-only viewer
// devDependencies do not compile clean on their own — so only diagnostics against its own
// `src/types/` files count. Every file there is listed, not just the ambient one: the
// filter is what makes a green result meaningful, which is also why the second test has
// to tell "tsc ran and found nothing" apart from "tsc did not run".

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// The ambient declarations plus every entry a plugin author can import. `base.ts` and
// `components.ts` arrive through those anyway; listing them makes the coverage
// independent of who imports whom.
const TYPE_FILES = [
  'sdkModules.d.ts',
  'base.ts',
  'components.ts',
  'map.ts',
  'bim.ts',
  'pointcloud.ts',
  'legend.ts',
].map(name => join(packageRoot, 'src/types', name))

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
  // The stats block is the only evidence the compiler ran: a clean run and a run that
  // never happened produce the same empty diagnostic list.
  '--extendedDiagnostics',
]

interface TscRun {
  /** tsc's exit code, or -1 if the process never started. */
  status: number
  output: string
  /** Diagnostic lines against this package's own type files, and only those. */
  diagnostics: string[]
}

function runTsc(): TscRun {
  if (!TSC) throw new Error('typescript not found')

  let status = 0
  let output = ''

  try {
    output = execFileSync(process.execPath, [TSC, ...TSC_ARGS, ...TYPE_FILES], {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; status?: number }
    status = failure.status ?? -1
    output = `${failure.stdout ?? ''}${failure.stderr ?? ''}`
  }

  return {
    status,
    output,
    // tsc reports paths relative to its cwd and forward-slashed, on Windows too.
    diagnostics: output
      .split(/\r?\n/)
      .filter(line => /(^|[\s(])src\/types\/[^\s]+\(\d+,\d+\): error/.test(line)),
  }
}

/** One run, shared by the assertions below. */
let cachedRun: TscRun | undefined
const tscRun = () => (cachedRun ??= runTsc())

describe('shipped type declarations', () => {
  it('has a compiler to check them with', () => {
    expect(TSC).toBeDefined()
  })

  it('actually ran that compiler over them', () => {
    const run = tscRun()

    // tsc's ExitStatus: 0 clean, 1 and 2 diagnostics reported (expected — the viewer
    // libraries do not compile clean with skipLibCheck off), 3 and 4 an unusable project.
    // -1 is this file's own marker for a process that never started.
    expect([0, 1, 2]).toContain(run.status)

    const files = /^Files:\s+(\d+)$/m.exec(run.output)

    expect(files).not.toBeNull()
    expect(Number(files?.[1])).toBeGreaterThan(1)
    expect(run.output).toMatch(/^Check time:/m)
  }, 120_000)

  it('compiles clean with skipLibCheck off, as a consumer would see it', () => {
    expect(tscRun().diagnostics.join('\n')).toBe('')
  }, 120_000)
})
