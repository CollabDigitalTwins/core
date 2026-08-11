// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Drift guard for `@collabdt/plugin-kit`'s hand-copied SDK module signatures.
 *
 * A plugin never installs `@collabdt/core`. It imports
 * `@collabdt/core/plugins-sdk/*` as bare specifiers the host resolves through its
 * import map, and typechecks against the kit's `src/types/sdkModules.d.ts`, where
 * those signatures are written out by hand. Nothing checked them:
 * `runtimeShims.exports.test.ts` compares *names* only, so a hook whose parameters
 * or return type moved in core kept typechecking in a plugin and failed at runtime.
 *
 * That is demonstrated risk, not theoretical — three of these signatures were found
 * wrong by hand-reading core while the kit was being written, and no test noticed.
 *
 * The component declarations have their own guard next door
 * (`pluginKitComponents.test.ts`); this covers everything else the ambient file
 * declares.
 *
 * How it reaches the declarations: the `/// <reference path>` below pulls in the
 * ambient file, so `import('@collabdt/core/plugins-sdk/config')` in a type position
 * resolves to the declaration rather than to a package on disk (there is none —
 * core is this repo). The real modules are imported by relative path, so the two
 * sides are genuinely different definitions.
 *
 * As with the components guard, vitest strips types without checking them, so the
 * `it()`s at the bottom run `tsc` over this file and read what it says about it.
 */

/// <reference path="../../../../packages/plugin-kit/src/types/sdkModules.d.ts" />

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

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

/**
 * The invariant, one-directional in the direction that matters: whatever the kit
 * promises a plugin, core must actually deliver.
 *
 * `Real extends Declared` means the real export can stand in for the declared one
 * everywhere the declaration is used — every parameter the declaration says is
 * optional really is, every parameter it accepts core accepts, and the value it
 * hands back is at least what the declaration says. A declaration deliberately
 * narrower than core (dropping a type parameter, say) still satisfies it; a
 * declaration that promises more than core delivers does not.
 *
 * The failure branch carries both types so the diagnostic names the mismatch
 * rather than just saying `true` was not assignable to `false`.
 */
type Provides<Real, Declared> = [Real] extends [Declared]
  ? true
  : { 'DRIFT: core no longer provides what the kit declares': Real, declared: Declared }

// The plugin's own configuration and identity. Core's `usePluginConfig` takes a
// type parameter for the stored shape; the declaration drops it and returns the
// default, which is a narrowing a plugin can still cast from.
const _usePluginConfig: Provides<typeof SdkConfig.usePluginConfig, DeclaredConfig['usePluginConfig']> = true
const _usePluginId: Provides<typeof SdkConfig.usePluginId, DeclaredConfig['usePluginId']> = true

// Translations. `fallback` being required on `usePluginMessage` is the whole point
// of the hook, so a core signature that made it optional would be a real change.
const _usePluginMessage: Provides<typeof SdkMessages.usePluginMessage, DeclaredMessages['usePluginMessage']> = true
const _usePluginTranslations: Provides<typeof SdkMessages.usePluginTranslations, DeclaredMessages['usePluginTranslations']> = true
// `typeof import(…)` is a query over the module's *values*, so the exported type
// has to be reached through the module type itself.
const _pluginTranslator: Provides<
  SdkMessages.PluginTranslator,
  import('@collabdt/core/plugins-sdk/messages').PluginTranslator
> = true

// Plugin-owned storage. `PluginStore` and `PluginDocument` are restated inside the
// ambient module rather than imported, so this compares the two definitions
// structurally — which is exactly the drift worth catching.
const _usePluginStore: Provides<typeof SdkStore.usePluginStore, DeclaredStore['usePluginStore']> = true

// The host contract itself.
const _validCapabilities: Provides<typeof SdkIndex.VALID_CAPABILITIES, DeclaredSdk['VALID_CAPABILITIES']> = true
const _hostApi: Provides<typeof SdkIndex.PLUGIN_HOST_API, DeclaredSdk['PLUGIN_HOST_API']> = true
const _validateManifest: Provides<typeof SdkIndex.validateManifest, DeclaredSdk['validateManifest']> = true

/**
 * `resolvePluginEntry` cannot be compared as written, and this is the one place
 * that is true.
 *
 * Core's is `(entry: PluginSource['entry']) => Promise<PluginEntry>`. The
 * declaration is generic — `<E>(entry: E | (() => Promise<E>)) => Promise<E>` —
 * because an ambient module cannot import `PluginEntry` from the kit's own type
 * entries, and restating that interface would give a plugin two definitions of it.
 * A concrete signature is never assignable to a generic one: the type parameter is
 * opaque, so `E` does not satisfy `PluginEntry` no matter what core does.
 *
 * So the declaration is instantiated at core's own `PluginEntry` first, and *that*
 * is what core has to satisfy. It is the same assertion every other line here
 * makes, at the one type a plugin will ever use it at.
 */
declare const declaredResolve: DeclaredSdk['resolvePluginEntry']
const _resolvePluginEntry: Provides<
  typeof SdkIndex.resolvePluginEntry,
  typeof declaredResolve<SdkIndex.PluginEntry>
> = true

/**
 * `useCoreTranslations` cannot be compared either, and for a reason that is the
 * kit's whole purpose rather than an oversight.
 *
 * Core returns next-intl's translator verbatim. That type constrains its key
 * parameter to the keys of the message catalogue, so a declaration promising a
 * plain `string` key is deliberately *wider* than the real thing and fails an
 * assignability check in both directions. Declaring it faithfully would mean
 * naming next-intl's types, which would drag next-intl into every plugin's
 * dependencies — the exact cost this package exists to avoid.
 *
 * What can be asserted is the contract at the call sites the declaration promises:
 * a namespace goes in as a string, a key goes in as a string, values are optional,
 * and a string comes back. This function is never called; TypeScript checks its
 * body regardless, which is the entire mechanism. It is named as a hook because it
 * calls one, which is also what keeps the rules-of-hooks lint honest about it.
 */
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

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../..')
const THIS_FILE = join(HERE, 'pluginKitSdkModules.test.ts')

const TSC = join(REPO_ROOT, 'node_modules/typescript/bin/tsc')

/** Not core's tsconfig: it sets `strict: false`, which would hide a nullability change. */
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
  // Prints a stats block whether or not anything was reported. It is the evidence
  // that the compiler ran and got as far as checking; diagnostics alone cannot
  // give that, since a clean run and a run that never happened look identical.
  '--extendedDiagnostics',
]

interface TscRun {
  /** tsc's exit code, or -1 if the process never started. */
  status: number
  output: string
  /** Diagnostic lines reported against this file, and only this file. */
  diagnostics: string[]
}

/**
 * Diagnostics are filtered to this file because checking it pulls in core's SDK
 * chain, and with it the viewer typings, which do not compile clean under
 * `--strict`. Failing on those would make this a referendum on unrelated code. The
 * cost of that filter is that "tsc never ran" reads exactly like "tsc found
 * nothing", so the run is reported separately and asserted on first.
 */
function runTsc(): TscRun {
  let status = 0
  let output = ''

  try {
    output = execFileSync(process.execPath, [TSC, ...TSC_ARGS, THIS_FILE], {
      cwd: REPO_ROOT,
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
    diagnostics: output
      .split(/\r?\n/)
      .filter(line => line.includes('pluginKitSdkModules.test.ts(')),
  }
}

/** One run, shared by the assertions below. tsc over this chain is not cheap. */
let cachedRun: TscRun | undefined
const tscRun = () => (cachedRun ??= runTsc())

describe('@collabdt/plugin-kit SDK module declarations', () => {
  it('has a compiler to run them with', () => {
    expect(existsSync(TSC)).toBe(true)
  })

  it('actually ran that compiler over this file', () => {
    const run = tscRun()

    // tsc's ExitStatus: 0 clean, 1 and 2 diagnostics reported, 3 and 4 an unusable
    // project. -1 is this file's own marker for a process that never started.
    expect([0, 1, 2]).toContain(run.status)

    const files = /^Files:\s+(\d+)$/m.exec(run.output)

    expect(files).not.toBeNull()
    expect(Number(files?.[1])).toBeGreaterThan(1)
    expect(run.output).toMatch(/^Check time:/m)
  }, 180_000)

  it('declares nothing core does not still provide', () => {
    expect(tscRun().diagnostics.join('\n')).toBe('')
  }, 180_000)
})
