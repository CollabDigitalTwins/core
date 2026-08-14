// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Runs `tsc` over the plugin-kit drift guards and reports what came back.
//
// The guards are compile-time assertions and vitest strips types without checking them, so
// each guard spawns the compiler over itself. Diagnostics are filtered to the guard's own
// file, since compiling one drags in core's UI and viewer chains, which never compiled
// clean under `--strict`. An empty filtered result has three causes — nothing wrong, the
// compiler never ran, errors landed elsewhere — and only the first is success, so this
// returns the run rather than a verdict and the caller asserts on each part.
//
// Under `__tests__/` because core's build excludes that directory: it spawns a process and
// must never reach a consumer's bundle.

import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const GUARD_DIR = resolve(HERE, '..')
export const REPO_ROOT = resolve(HERE, '../../../../..')

export const TSC = join(REPO_ROOT, 'node_modules/typescript/bin/tsc')

// A project rather than a list of flags because `paths` has no command-line form, and
// without it the two sides of the comparison resolve different copies of React's types.
const TSC_PROJECT = join(GUARD_DIR, 'pluginKit.tsconfig.json')

const TSC_ARGS = [
  '-p', TSC_PROJECT,
  // Evidence the compiler ran, reached checking, and had the caller's file in the program:
  // with `-p` the tsconfig decides that, so a dropped file leaves its assertions unrun.
  '--extendedDiagnostics',
  '--listFiles',
]

export interface TscRun {
  /** tsc's ExitStatus: 0 clean, 1-2 diagnostics reported, 3-4 unusable project, -1 never started. */
  status: number
  /** stdout and stderr together; tsc reports diagnostics on stdout. */
  output: string
  /** Whether the compiled program contained the file asked about. */
  compiledTheFile: boolean
  /** How many files were in the program, or -1 if tsc reported no count. */
  fileCount: number
  /** Whether tsc reached the checking phase. */
  checked: boolean
  /** Diagnostic lines against that file, and only that file. */
  diagnostics: string[]
}

/** `fileName` is a basename, e.g. `pluginKitComponents.test.ts`. */
export function runTsc(fileName: string): TscRun {
  let status = 0
  let output = ''

  try {
    output = execFileSync(process.execPath, [TSC, ...TSC_ARGS], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    // tsc exits non-zero whenever it reports anything, other files included. A failure to
    // start lands here too, with no status and no output — kept separable from a clean run.
    const failure = error as { stdout?: string; stderr?: string; status?: number }
    status = failure.status ?? -1
    output = `${failure.stdout ?? ''}${failure.stderr ?? ''}`
  }

  const lines = output.split(/\r?\n/)
  // tsc forward-slashes the absolute paths it lists, on Windows as on POSIX.
  const wanted = join(GUARD_DIR, fileName).replace(/\\/g, '/')
  const files = /^Files:\s+(\d+)$/m.exec(output)

  return {
    status,
    output,
    compiledTheFile: lines.includes(wanted),
    fileCount: files ? Number(files[1]) : -1,
    checked: /^Check time:/m.test(output),
    diagnostics: lines.filter(line => line.includes(`${fileName}(`)),
  }
}
