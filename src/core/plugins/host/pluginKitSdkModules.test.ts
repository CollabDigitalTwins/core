// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Drift guard for `@collabdt/plugin-kit`'s hand-copied SDK module signatures.
//
// A plugin never installs `@collabdt/core`: it typechecks against the kit's
// `src/types/sdkModules.d.ts`, where those signatures are written out by hand. Nothing
// checked them — `runtimeShims.exports.test.ts` compares *names* only, so a hook whose
// parameters or return type moved in core kept typechecking in a plugin and failed at
// runtime. Demonstrated risk, not theoretical: three signatures were found wrong by
// hand-reading core while the kit was being written, and no test noticed.
//
// The `/// <reference path>` below pulls in the ambient file, so
// `import('@collabdt/core/plugins-sdk/config')` in a type position resolves to the
// declaration rather than to a package on disk (there is none — core is this repo), while
// the real modules are imported by relative path. The two sides are genuinely different
// definitions. Component declarations have their own guard in
// `pluginKitComponents.test.ts`.

/// <reference path="../../../../packages/plugin-kit/src/types/sdkModules.d.ts" />

import { existsSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { runTsc, TSC, type TscRun } from './__tests__/tscProbe'

// Type-only: nothing here is loaded at runtime, so this stays a node-env test.
import type * as SdkConfig from '../sdk/config'
import type * as SdkIndex from '../sdk/index'
import type * as SdkMessages from '../sdk/messages'
import type * as SdkStore from '../sdk/store'

// --- Compile-time assertions ---

type DeclaredSdk = typeof import('@collabdt/core/plugins-sdk')
type DeclaredConfig = typeof import('@collabdt/core/plugins-sdk/config')
type DeclaredMessages = typeof import('@collabdt/core/plugins-sdk/messages')
type DeclaredStore = typeof import('@collabdt/core/plugins-sdk/store')

// The invariant, one-directional in the direction that matters: whatever the kit promises
// a plugin, core must deliver. `Real extends Declared` means the real export can stand in
// for the declared one everywhere it is used, so a declaration narrower than core (a
// dropped type parameter, say) still satisfies it while one promising more does not. The
// failure branch carries both types so the diagnostic names the mismatch instead of
// saying `true` was not assignable to `false`.
type Provides<Real, Declared> = [Real] extends [Declared]
  ? true
  : { 'DRIFT: core no longer provides what the kit declares': Real, declared: Declared }

// Core's `usePluginConfig` takes a type parameter for the stored shape; the declaration
// drops it and returns the default, a narrowing a plugin can still cast from.
const _usePluginConfig: Provides<typeof SdkConfig.usePluginConfig, DeclaredConfig['usePluginConfig']> = true
const _usePluginId: Provides<typeof SdkConfig.usePluginId, DeclaredConfig['usePluginId']> = true

// `fallback` being required on `usePluginMessage` is the whole point of the hook, so a
// core signature that made it optional would be a real change.
const _usePluginMessage: Provides<typeof SdkMessages.usePluginMessage, DeclaredMessages['usePluginMessage']> = true
const _usePluginTranslations: Provides<typeof SdkMessages.usePluginTranslations, DeclaredMessages['usePluginTranslations']> = true
// `typeof import(…)` is a query over the module's *values*, so the exported type
// has to be reached through the module type itself.
const _pluginTranslator: Provides<
  SdkMessages.PluginTranslator,
  import('@collabdt/core/plugins-sdk/messages').PluginTranslator
> = true

// `PluginStore` and `PluginDocument` are restated inside the ambient module rather than
// imported, so this compares two genuinely separate definitions structurally.
const _usePluginStore: Provides<typeof SdkStore.usePluginStore, DeclaredStore['usePluginStore']> = true

const _validCapabilities: Provides<typeof SdkIndex.VALID_CAPABILITIES, DeclaredSdk['VALID_CAPABILITIES']> = true
const _hostApi: Provides<typeof SdkIndex.PLUGIN_HOST_API, DeclaredSdk['PLUGIN_HOST_API']> = true
const _validateManifest: Provides<typeof SdkIndex.validateManifest, DeclaredSdk['validateManifest']> = true

// `resolvePluginEntry` cannot be compared as written. The declaration is generic because
// an ambient module cannot import `PluginEntry`, and restating that interface would give a
// plugin two definitions of it — but a concrete signature is never assignable to a generic
// one, since `E` is opaque and satisfies `PluginEntry` for no value of core. So the
// declaration is instantiated at core's own `PluginEntry` first, which is the one type a
// plugin will ever use it at.
declare const declaredResolve: DeclaredSdk['resolvePluginEntry']
const _resolvePluginEntry: Provides<
  typeof SdkIndex.resolvePluginEntry,
  typeof declaredResolve<SdkIndex.PluginEntry>
> = true

// `useCoreTranslations` cannot be compared either, for a reason that is the kit's whole
// purpose. Core returns next-intl's translator verbatim, whose key parameter is
// constrained to the message catalogue's keys, so the declaration's plain `string` key is
// deliberately *wider* and fails assignability in both directions. Declaring it
// faithfully would drag next-intl into every plugin's dependencies.
//
// What can be asserted is the contract at the call sites the declaration promises. This
// function is never called; TypeScript checks its body regardless, which is the entire
// mechanism. It is named as a hook because it calls one, which also keeps the
// rules-of-hooks lint honest about it.
function useCoreTranslationCallSites(
  useCoreTranslations: typeof SdkMessages.useCoreTranslations,
): void {
  const t = useCoreTranslations('someNamespace')

  const plain: string = t('some.key')
  const interpolated: string = t('some.key', { count: 1 })

  void [plain, interpolated]
}

void [
  _usePluginConfig, _usePluginId,
  _usePluginMessage, _usePluginTranslations, _pluginTranslator,
  _usePluginStore,
  _validCapabilities, _hostApi, _validateManifest, _resolvePluginEntry,
  useCoreTranslationCallSites,
]

// --- The runtime half that makes the assertions above actually run ---

// One run per file, shared by the assertions below.
let cachedRun: TscRun | undefined
const tscRun = () => (cachedRun ??= runTsc('pluginKitSdkModules.test.ts'))

describe('@collabdt/plugin-kit SDK module declarations', () => {
  it('has a compiler to run them with', () => {
    expect(existsSync(TSC)).toBe(true)
  })

  it('actually ran that compiler over this file', () => {
    const run = tscRun()

    // A verdict, not a crash and not a broken project.
    expect([0, 1, 2]).toContain(run.status)
    // The assertions above were in the program tsc compiled.
    expect(run.compiledTheFile).toBe(true)
    // Over core's real SDK chain, and it got as far as checking.
    expect(run.fileCount).toBeGreaterThan(1)
    expect(run.checked).toBe(true)
  }, 180_000)

  it('declares nothing core does not still provide', () => {
    expect(tscRun().diagnostics.join('\n')).toBe('')
  }, 180_000)
})
