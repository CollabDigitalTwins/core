// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export * from './types'
export * from './version'
export * from './components'

// The single source the app's shim generator, the import map it publishes and
// @collabdt/plugin-kit's build preset all derive from.
export { PLUGIN_RUNTIME_SHIMS, PLUGIN_EXTERNALS } from '../host/runtimeShims'
export type { RuntimeShim } from '../host/runtimeShims'
