// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Drift guard for `@collabdt/plugin-kit`'s hand-restated component declarations.
 *
 * The kit cannot import core's real component types: they come from `@radix-ui/*`
 * and `class-variance-authority`, and making a plugin author install Radix to
 * typecheck a `<Button>` is exactly what the kit exists to avoid. So the kit
 * restates them — and a restatement rots. Rename a prop in `components/ui/` and the
 * kit keeps publishing the old name, silently, in a `.d.ts` nobody rebuilds.
 *
 * This test lives in core rather than in the kit because that rename happens here.
 *
 * Two halves:
 *
 *  - The `Narrows<…>` assertions below are compile-time. They compare the kit's
 *    declared props against the props of the very components `sdk/components`
 *    re-exports, which is what the host's shim serves.
 *  - vitest strips types without checking them, so the `it()` at the bottom runs
 *    `tsc` over this file and fails if it reports anything against it.
 *
 * The kit's types are imported by **file path**, not through
 * `@collabdt/core/plugins-sdk/components`. That specifier resolves to the kit's own
 * ambient declaration, so importing it would compare the declaration to itself and
 * pass no matter how far core moved.
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// Type-only: nothing here is loaded at runtime, so this stays a node-env test.
import type * as Kit from '../../../../packages/plugin-kit/src/types/components'
import type * as Sdk from '../sdk/components'
import type * as React from 'react'

// --- Compile-time assertions ---

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

/** The keys of `T` that a caller cannot leave out. */
type RequiredKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? never : K }[keyof T]

/**
 * The invariant. Two directions, and they are not symmetric:
 *
 *  - Every prop the kit declares must exist on the real component with an
 *    identical type. The kit is allowed to *omit* props — several declarations are
 *    deliberately narrower than the Radix-backed original — but it may never invent
 *    a prop core does not have, nor type one differently. `keyof Declared extends
 *    keyof Real` catches a rename or a removal; comparing against `Pick<Real, keyof
 *    Declared>` catches a changed type on a prop the kit does declare.
 *  - Every prop core *requires* must be one the kit declares. Optional props may
 *    be omitted freely, but a newly-required one cannot: the kit would let plugin
 *    code leave it out and still typecheck, and the component would render without
 *    something core now insists on. `Pick<Real, keyof Declared & keyof Real>` on
 *    its own is blind to that, because it drops every key the kit does not already
 *    have — required and optional alike.
 */
type Narrows<Declared, Real> = [keyof Declared] extends [keyof Real]
  ? Exact<Declared, Pick<Real, keyof Declared & keyof Real>> extends true
    ? [Exclude<RequiredKeys<Real>, keyof Declared>] extends [never]
      ? true
      : { 'DRIFT: core requires a prop the kit does not declare': Exclude<RequiredKeys<Real>, keyof Declared> }
    : 'DRIFT: a prop the kit declares has a different type in core'
  : 'DRIFT: the kit declares a prop core does not have — renamed or removed?'

const _button: Narrows<React.ComponentProps<Kit.ButtonComponent>, React.ComponentProps<typeof Sdk.Button>> = true
const _input: Narrows<React.ComponentProps<Kit.InputComponent>, React.ComponentProps<typeof Sdk.Input>> = true
const _badge: Narrows<React.ComponentProps<Kit.BadgeComponent>, React.ComponentProps<typeof Sdk.Badge>> = true
const _separator: Narrows<React.ComponentProps<Kit.SeparatorComponent>, React.ComponentProps<typeof Sdk.Separator>> = true

const _card: Narrows<React.ComponentProps<Kit.CardComponent>, React.ComponentProps<typeof Sdk.Card>> = true
const _cardHeader: Narrows<React.ComponentProps<Kit.CardComponent>, React.ComponentProps<typeof Sdk.CardHeader>> = true
const _cardTitle: Narrows<React.ComponentProps<Kit.CardComponent>, React.ComponentProps<typeof Sdk.CardTitle>> = true
const _cardDescription: Narrows<React.ComponentProps<Kit.CardComponent>, React.ComponentProps<typeof Sdk.CardDescription>> = true
const _cardContent: Narrows<React.ComponentProps<Kit.CardComponent>, React.ComponentProps<typeof Sdk.CardContent>> = true
const _cardFooter: Narrows<React.ComponentProps<Kit.CardComponent>, React.ComponentProps<typeof Sdk.CardFooter>> = true

const _dialog: Narrows<React.ComponentProps<Kit.DialogComponent>, React.ComponentProps<typeof Sdk.Dialog>> = true
const _dialogTrigger: Narrows<React.ComponentProps<Kit.DialogTriggerComponent>, React.ComponentProps<typeof Sdk.DialogTrigger>> = true
const _dialogClose: Narrows<React.ComponentProps<Kit.DialogTriggerComponent>, React.ComponentProps<typeof Sdk.DialogClose>> = true
const _dialogContent: Narrows<React.ComponentProps<Kit.DialogContentComponent>, React.ComponentProps<typeof Sdk.DialogContent>> = true
const _dialogHeader: Narrows<React.ComponentProps<Kit.DialogSectionComponent>, React.ComponentProps<typeof Sdk.DialogHeader>> = true
const _dialogFooter: Narrows<React.ComponentProps<Kit.DialogSectionComponent>, React.ComponentProps<typeof Sdk.DialogFooter>> = true
const _dialogTitle: Narrows<React.ComponentProps<Kit.DialogTitleComponent>, React.ComponentProps<typeof Sdk.DialogTitle>> = true
const _dialogDescription: Narrows<React.ComponentProps<Kit.DialogDescriptionComponent>, React.ComponentProps<typeof Sdk.DialogDescription>> = true

void [
  _button, _input, _badge, _separator,
  _card, _cardHeader, _cardTitle, _cardDescription, _cardContent, _cardFooter,
  _dialog, _dialogTrigger, _dialogClose, _dialogContent,
  _dialogHeader, _dialogFooter, _dialogTitle, _dialogDescription,
]

// --- The runtime half that makes the assertions above actually run ---

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../..')
const THIS_FILE = join(HERE, 'pluginKitComponents.test.ts')

const TSC = join(REPO_ROOT, 'node_modules/typescript/bin/tsc')

/**
 * The settings live in `pluginKit.tsconfig.json` beside this file, which also
 * names the files to compile. They are the kit's own settings rather than core's,
 * which sets `strict: false` and would collapse `string | undefined` into `string`;
 * and they pin `react` to one copy of its types, without which this comparison
 * fails on version skew between two installs rather than on drift. See that file.
 */
const TSC_ARGS = [
  '-p', join(HERE, 'pluginKit.tsconfig.json'),
  // Prints a stats block ("Files: 823", "Check time: 1.03s") whether or not it
  // reported anything, and lists every file in the program. Together they are the
  // evidence the compiler ran, reached the checking phase, and had this file in
  // front of it — none of which the diagnostics can show, since a clean run and a
  // run that never happened both produce zero matching lines.
  '--extendedDiagnostics',
  '--listFiles',
]

interface TscRun {
  /** tsc's exit code: 0 clean, 1 diagnostics reported, 2+ a configuration failure. */
  status: number
  /** stdout and stderr together; tsc reports diagnostics on stdout. */
  output: string
  /** Diagnostic lines reported against this file, and only this file. */
  diagnostics: string[]
}

/**
 * Runs tsc over this file and reports what came back.
 *
 * Diagnostics are filtered to this file because checking it drags in core's whole
 * UI import chain, which does not compile clean under `--strict` — it was never
 * meant to, core builds with `strict: false`. Failing on those would make this test
 * a referendum on unrelated code.
 *
 * That filter is also what makes "tsc never ran" and "every error landed elsewhere"
 * both read as success, which is the shape that let a `skipLibCheck` defect ship.
 * So the run itself is reported separately from its diagnostics, and asserted on
 * before the absence of diagnostics is allowed to mean anything.
 */
function runTsc(): TscRun {
  let status = 0
  let output = ''

  try {
    output = execFileSync(process.execPath, [TSC, ...TSC_ARGS], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    // tsc exits non-zero whenever it reports anything, including for other files.
    // A failure to *start* lands here too, with no status and no output, which is
    // exactly the case this needs to keep separable from a clean compile.
    const failure = error as { stdout?: string; stderr?: string; status?: number }
    status = failure.status ?? -1
    output = `${failure.stdout ?? ''}${failure.stderr ?? ''}`
  }

  return {
    status,
    output,
    diagnostics: output
      .split(/\r?\n/)
      .filter(line => line.includes('pluginKitComponents.test.ts(')),
  }
}

/** One run, shared by the assertions below. tsc over this chain is not cheap. */
let cachedRun: TscRun | undefined
const tscRun = () => (cachedRun ??= runTsc())

describe('@collabdt/plugin-kit component declarations', () => {
  it('has a compiler to run them with', () => {
    expect(existsSync(TSC)).toBe(true)
  })

  it('actually ran that compiler over this file', () => {
    const run = tscRun()

    // tsc's ExitStatus: 0 clean, 1 and 2 diagnostics reported (which is expected
    // here — core's chain does not compile clean under --strict), 3 and 4 an
    // unusable project. -1 is this file's own marker for a process that never
    // started. Only the first three are a verdict on the code.
    expect([0, 1, 2]).toContain(run.status)

    // With `-p`, the file list comes from the tsconfig. Dropping this file from it
    // would leave every assertion above unchecked and this test green, so the
    // program is asked what it actually compiled.
    expect(run.output.split(/\r?\n/)).toContain(THIS_FILE.replace(/\\/g, '/'))

    // And it got past parsing into checking, over a program that really did pull
    // in core's chain rather than this file alone.
    const files = /^Files:\s+(\d+)$/m.exec(run.output)

    expect(files).not.toBeNull()
    expect(Number(files?.[1])).toBeGreaterThan(1)
    expect(run.output).toMatch(/^Check time:/m)
  }, 180_000)

  it('declares no prop the real components do not have, and none with a different type', () => {
    expect(tscRun().diagnostics.join('\n')).toBe('')
  }, 180_000)
})
