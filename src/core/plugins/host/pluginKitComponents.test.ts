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

/**
 * The invariant, and it is one-directional: every prop the kit declares must exist
 * on the real component with an identical type. The kit is allowed to omit props —
 * several declarations are deliberately narrower than the Radix-backed original —
 * but it may never invent a prop core does not have, nor type one differently.
 *
 * `keyof Declared extends keyof Real` catches a rename or a removal. Comparing
 * against `Pick<Real, keyof Declared>` catches a changed type on a prop the kit
 * does declare. What it deliberately does not catch is core *adding* a prop: that
 * leaves the kit behind but never wrong.
 */
type Narrows<Declared, Real> = [keyof Declared] extends [keyof Real]
  ? Exact<Declared, Pick<Real, keyof Declared & keyof Real>> extends true
    ? true
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
 * Deliberately not core's tsconfig: it sets `strict: false`, which would collapse
 * `string | undefined` into `string` and let a nullability change through. These
 * are the kit's own settings instead.
 */
const TSC_ARGS = [
  '--noEmit',
  '--strict',
  '--skipLibCheck',
  '--jsx', 'react-jsx',
  '--target', 'es2022',
  '--module', 'esnext',
  '--moduleResolution', 'bundler',
  '--lib', 'es2022,dom,dom.iterable',
  '--esModuleInterop',
  '--resolveJsonModule',
]

/**
 * Diagnostics reported against this file, and only this file.
 *
 * Checking this file drags in core's whole UI import chain, which does not compile
 * clean under `--strict` — it was never meant to, core builds with `strict: false`.
 * Failing on those would make this test a referendum on unrelated code. A broken
 * assertion is reported at its own line here, so that is what gets read.
 */
function diagnosticsAgainstThisFile(): string[] {
  let output = ''

  try {
    execFileSync(process.execPath, [TSC, ...TSC_ARGS, THIS_FILE], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    // tsc exits non-zero whenever it reports anything, including for other files.
    const failure = error as { stdout?: string; stderr?: string }
    output = `${failure.stdout ?? ''}${failure.stderr ?? ''}`
  }

  return output
    .split(/\r?\n/)
    .filter(line => line.includes('pluginKitComponents.test.ts('))
}

describe('@collabdt/plugin-kit component declarations', () => {
  it('has a compiler to run them with', () => {
    expect(existsSync(TSC)).toBe(true)
  })

  it('declares no prop the real components do not have, and none with a different type', () => {
    const diagnostics = diagnosticsAgainstThisFile()

    expect(diagnostics.join('\n')).toBe('')
  }, 180_000)
})
