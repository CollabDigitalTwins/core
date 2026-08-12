// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Drift guard for `@collabdt/plugin-kit`'s hand-restated component declarations.
//
// The kit cannot import core's real component types — they come from `@radix-ui/*` and
// `class-variance-authority`, and making a plugin author install Radix to typecheck a
// `<Button>` is what the kit exists to avoid — so it restates them, and a restatement
// rots: rename a prop in `components/ui/` and the kit keeps publishing the old name in a
// `.d.ts` nobody rebuilds. The guard lives in core because that rename happens here.
//
// The kit's types are imported by **file path**, never through
// `@collabdt/core/plugins-sdk/components`: that specifier resolves to the kit's own
// ambient declaration, so it would compare the declaration to itself and pass no matter
// how far core moved.

import { existsSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { runTsc, TSC, type TscRun } from './__tests__/tscProbe'

// Type-only: nothing here is loaded at runtime, so this stays a node-env test.
import type * as Kit from '../../../../packages/plugin-kit/src/types/components'
import type * as Sdk from '../sdk/components'
import type * as React from 'react'

// --- Compile-time assertions ---

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

/** The keys of `T` that a caller cannot leave out. */
type RequiredKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? never : K }[keyof T]

// The invariant, in two directions that are not symmetric:
//
//  - Every prop the kit declares must exist on the real component with an identical type.
//    Omitting props is allowed and several declarations are deliberately narrower, but
//    the kit may never invent a prop core lacks or type one differently. `keyof Declared
//    extends keyof Real` catches a rename or removal; `Pick<Real, keyof Declared>`
//    catches a changed type on a prop the kit does declare.
//  - Every prop core *requires* must be one the kit declares, or plugin code leaves it
//    out and still typechecks. `Pick<Real, keyof Declared & keyof Real>` is blind to
//    that, since it drops every key the kit does not already have.
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

// One run per file, shared by the assertions below.
let cachedRun: TscRun | undefined
const tscRun = () => (cachedRun ??= runTsc('pluginKitComponents.test.ts'))

describe('@collabdt/plugin-kit component declarations', () => {
  it('has a compiler to run them with', () => {
    expect(existsSync(TSC)).toBe(true)
  })

  it('actually ran that compiler over this file', () => {
    const run = tscRun()

    // A verdict, not a crash and not a broken project.
    expect([0, 1, 2]).toContain(run.status)
    // The assertions above were in the program tsc compiled.
    expect(run.compiledTheFile).toBe(true)
    // Over core's real chain, and it got as far as checking.
    expect(run.fileCount).toBeGreaterThan(1)
    expect(run.checked).toBe(true)
  }, 180_000)

  it('declares no prop the real components do not have, and none with a different type', () => {
    expect(tscRun().diagnostics.join('\n')).toBe('')
  }, 180_000)
})
