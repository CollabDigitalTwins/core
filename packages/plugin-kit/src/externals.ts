// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// The bare specifiers the CDT host resolves through its import map. A plugin bundle
// must leave these unbundled and must import nothing else.
//
// A literal rather than an import from `@collabdt/core`, so this package has no runtime
// dependencies: scaffolding a legend plugin should not mean installing three.js. The
// cost is drift, which core's `src/core/plugins/host/pluginKitDrift.test.ts` prevents.
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

// Libraries that must never appear in a plugin bundle: a second copy of any of them is
// a documented crash rather than a size regression — React breaks hooks, three.js breaks
// the BIM viewer. Only used for a better error message; anything outside
// `PLUGIN_EXTERNALS` is rejected whether or not it is listed here.
export const KNOWN_FORBIDDEN: readonly string[] = [
  'three',
  '@thatopen/components',
  '@thatopen/components-front',
  '@thatopen/fragments',
  'maplibre-gl',
  'lucide-react',
]
