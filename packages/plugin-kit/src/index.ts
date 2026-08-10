// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export { KNOWN_FORBIDDEN, PLUGIN_EXTERNALS } from './externals'
export { assertBundleImports, checkImports, collectExternalImports } from './importGuard'
export type { Metafile } from './importGuard'
export { pluginPreset } from './preset'
