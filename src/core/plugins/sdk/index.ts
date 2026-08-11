// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Types
export * from './types'

// Host contract version
export * from './version'

// Components
export * from './components'

// Runtime shim registry (single source for the app's shim generator, the
// import map it publishes, and @collabdt/plugin-kit's build preset)
export { PLUGIN_RUNTIME_SHIMS, PLUGIN_EXTERNALS } from '../host/runtimeShims'
export type { RuntimeShim } from '../host/runtimeShims'
