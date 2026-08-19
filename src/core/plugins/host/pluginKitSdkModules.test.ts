// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Drift guard for `@collabdt/plugin-kit`'s hand-copied SDK module signatures.
//
// A plugin never installs `@collabdt/core`; it typechecks against the kit's
// `src/types/sdkModules.d.ts`, written out by hand. `runtimeShims.exports.test.ts`
// compares names only, so a hook whose parameters moved in core would still typecheck
// in a plugin and fail at runtime.
//
// The `/// <reference path>` pulls in the ambient file, so a type-position
// `import('@collabdt/core/plugins-sdk/config')` resolves to the declaration while the
// real modules come in by relative path — two genuinely separate definitions.
// Components have their own guard in `pluginKitComponents.test.ts`.

/// <reference path="../../../../packages/plugin-kit/src/types/sdkModules.d.ts" />

import { existsSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { runTsc, TSC, type TscRun } from './__tests__/tscProbe'

// Type-only: nothing here is loaded at runtime, so this stays a node-env test.
import type * as SdkConfig from '../sdk/config'
import type * as SdkData from '../sdk/data'
import type * as SdkIndex from '../sdk/index'
import type * as SdkMessages from '../sdk/messages'
import type * as SdkStore from '../sdk/store'

// --- Compile-time assertions ---

type DeclaredSdk = typeof import('@collabdt/core/plugins-sdk')
type DeclaredConfig = typeof import('@collabdt/core/plugins-sdk/config')
type DeclaredData = typeof import('@collabdt/core/plugins-sdk/data')
type DeclaredMessages = typeof import('@collabdt/core/plugins-sdk/messages')
type DeclaredStore = typeof import('@collabdt/core/plugins-sdk/store')

// The invariant, one-directional: whatever the kit promises a plugin, core must deliver.
// `Real extends Declared` lets a declaration narrower than core pass while one promising
// more fails. The failure branch carries both types so the diagnostic names the mismatch.
type Provides<Real, Declared> = [Real] extends [Declared]
  ? true
  : { 'DRIFT: core no longer provides what the kit declares': Real, declared: Declared }

// Core's `usePluginConfig` takes a type parameter; the declaration drops it and returns
// the default, a narrowing a plugin can still cast from.
const _usePluginConfig: Provides<typeof SdkConfig.usePluginConfig, DeclaredConfig['usePluginConfig']> = true
const _usePluginId: Provides<typeof SdkConfig.usePluginId, DeclaredConfig['usePluginId']> = true

// A required `fallback` is the point of `usePluginMessage`; making it optional in core
// would be a real change.
const _usePluginMessage: Provides<typeof SdkMessages.usePluginMessage, DeclaredMessages['usePluginMessage']> = true
const _usePluginTranslations: Provides<typeof SdkMessages.usePluginTranslations, DeclaredMessages['usePluginTranslations']> = true
// `typeof import(…)` queries values, so the exported type comes through the module type.
const _pluginTranslator: Provides<
  SdkMessages.PluginTranslator,
  import('@collabdt/core/plugins-sdk/messages').PluginTranslator
> = true

// `PluginStore` and `PluginDocument` are restated in the ambient module, not imported, so
// this compares two separate definitions structurally.
const _usePluginStore: Provides<typeof SdkStore.usePluginStore, DeclaredStore['usePluginStore']> = true

// Each result drops the mutation handles core returns beside it, which is what makes buildings and sites read-only to a plugin.
const _useBuildings: Provides<typeof SdkData.useBuildings, DeclaredData['useBuildings']> = true
const _useBuilding: Provides<typeof SdkData.useBuilding, DeclaredData['useBuilding']> = true
const _useBuildingsByOsm: Provides<typeof SdkData.useBuildingsByOsm, DeclaredData['useBuildingsByOsm']> = true
const _useBuildingOsmIds: Provides<typeof SdkData.useBuildingOsmIds, DeclaredData['useBuildingOsmIds']> = true
const _useSites: Provides<typeof SdkData.useSites, DeclaredData['useSites']> = true
const _useSite: Provides<typeof SdkData.useSite, DeclaredData['useSite']> = true
const _useInfrastructures: Provides<typeof SdkData.useInfrastructures, DeclaredData['useInfrastructures']> = true
const _useInfrastructure: Provides<typeof SdkData.useInfrastructure, DeclaredData['useInfrastructure']> = true
const _useOrganization: Provides<typeof SdkData.useOrganization, DeclaredData['useOrganization']> = true
const _useOrganizationByName: Provides<typeof SdkData.useOrganizationByName, DeclaredData['useOrganizationByName']> = true
const _useFiles: Provides<typeof SdkData.useFiles, DeclaredData['useFiles']> = true
const _useFile: Provides<typeof SdkData.useFile, DeclaredData['useFile']> = true
const _useFilesByBuildingId: Provides<typeof SdkData.useFilesByBuildingId, DeclaredData['useFilesByBuildingId']> = true
const _useFilesBySiteId: Provides<typeof SdkData.useFilesBySiteId, DeclaredData['useFilesBySiteId']> = true
const _useSensors: Provides<typeof SdkData.useSensors, DeclaredData['useSensors']> = true
const _useSensor: Provides<typeof SdkData.useSensor, DeclaredData['useSensor']> = true
const _useSensorsByBuilding: Provides<typeof SdkData.useSensorsByBuilding, DeclaredData['useSensorsByBuilding']> = true
const _useSensorsByAuthor: Provides<typeof SdkData.useSensorsByAuthor, DeclaredData['useSensorsByAuthor']> = true
const _useSensorTypes: Provides<typeof SdkData.useSensorTypes, DeclaredData['useSensorTypes']> = true
const _useSensorType: Provides<typeof SdkData.useSensorType, DeclaredData['useSensorType']> = true
const _useComments: Provides<typeof SdkData.useComments, DeclaredData['useComments']> = true
const _useComment: Provides<typeof SdkData.useComment, DeclaredData['useComment']> = true
const _useCommentsByBuilding: Provides<typeof SdkData.useCommentsByBuilding, DeclaredData['useCommentsByBuilding']> = true
const _useCommentsByAuthor: Provides<typeof SdkData.useCommentsByAuthor, DeclaredData['useCommentsByAuthor']> = true
const _usePluginPermissions: Provides<typeof SdkData.usePluginPermissions, DeclaredData['usePluginPermissions']> = true
const _useCreateSensor: Provides<typeof SdkData.useCreateSensor, DeclaredData['useCreateSensor']> = true
const _useCreateComment: Provides<typeof SdkData.useCreateComment, DeclaredData['useCreateComment']> = true
const _useDeleteComments: Provides<typeof SdkData.useDeleteComments, DeclaredData['useDeleteComments']> = true
const _useDownloadFile: Provides<typeof SdkData.useDownloadFile, DeclaredData['useDownloadFile']> = true

const _validCapabilities: Provides<typeof SdkIndex.VALID_CAPABILITIES, DeclaredSdk['VALID_CAPABILITIES']> = true
const _hostApi: Provides<typeof SdkIndex.PLUGIN_HOST_API, DeclaredSdk['PLUGIN_HOST_API']> = true
const _validateManifest: Provides<typeof SdkIndex.validateManifest, DeclaredSdk['validateManifest']> = true

// `resolvePluginEntry` cannot be compared as written: the declaration is generic (an
// ambient module cannot import `PluginEntry`, and restating it would give a plugin two
// definitions), and a concrete signature is never assignable to a generic one. So it is
// instantiated at core's own `PluginEntry` first, the only type a plugin uses it at.
declare const declaredResolve: DeclaredSdk['resolvePluginEntry']
const _resolvePluginEntry: Provides<
  typeof SdkIndex.resolvePluginEntry,
  typeof declaredResolve<SdkIndex.PluginEntry>
> = true

// `useCoreTranslations` cannot be compared either: core returns next-intl's translator
// verbatim, keyed to the catalogue, so the declaration's plain `string` key is wider and
// fails in both directions. Declaring it faithfully would drag next-intl into every
// plugin's dependencies.
//
// What can be asserted is the call sites the declaration promises. This is never called;
// tsc checks the body regardless, which is the mechanism.
function useCoreTranslationCallSites(
  useCoreTranslations: typeof SdkMessages.useCoreTranslations,
): void {
  const t = useCoreTranslations('someNamespace')

  const plain: string = t('some.key')
  const interpolated: string = t('some.key', { count: 1 })

  void [plain, interpolated]
}

void [
  _useBuildings, _useBuilding, _useBuildingsByOsm, _useBuildingOsmIds,
  _useSites, _useSite, _useInfrastructures, _useInfrastructure,
  _useOrganization, _useOrganizationByName,
  _useFiles, _useFile, _useFilesByBuildingId, _useFilesBySiteId,
  _useSensors, _useSensor, _useSensorsByBuilding, _useSensorsByAuthor,
  _useSensorTypes, _useSensorType,
  _useComments, _useComment, _useCommentsByBuilding, _useCommentsByAuthor,
  _usePluginPermissions,
  _useCreateSensor, _useCreateComment, _useDeleteComments, _useDownloadFile,
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
