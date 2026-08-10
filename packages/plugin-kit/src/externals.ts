// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * The bare specifiers the CDT host resolves for a plugin through its import map.
 * A plugin bundle must leave these unbundled and must import nothing else.
 *
 * Kept as a literal rather than imported from `@collabdt/core` so this package
 * stays free of runtime dependencies: an author scaffolding a legend plugin
 * should not install three.js to read a config object. The cost is that the list
 * can drift, which `src/core/plugins/host/pluginKitDrift.test.ts` in core exists
 * to prevent.
 */
export const PLUGIN_EXTERNALS: readonly string[] = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@collabdt/core/plugins-sdk',
  '@collabdt/core/plugins-sdk/config',
  '@collabdt/core/plugins-sdk/messages',
  '@collabdt/core/plugins-sdk/store',
  '@collabdt/core/plugins-sdk/components',
]

/**
 * Libraries that must never appear in a plugin bundle. A second copy of any of
 * them is a documented crash rather than a size regression: React breaks hooks,
 * three.js breaks the BIM viewer.
 *
 * Used only to give the import guard a better error message. Anything not in
 * `PLUGIN_EXTERNALS` is rejected regardless of whether it appears here.
 */
export const KNOWN_FORBIDDEN: readonly string[] = [
  'three',
  '@thatopen/components',
  '@thatopen/components-front',
  '@thatopen/fragments',
  'maplibre-gl',
  'lucide-react',
]
