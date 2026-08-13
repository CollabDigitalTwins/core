// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// The bare specifiers the host resolves through its import map. A plugin must leave these
// unbundled and import nothing else.
//
// A literal rather than an import from `@collabdt/core`, so this package has no runtime
// dependencies. Core's pluginKitDrift.test.ts prevents the drift that buys.
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

// A second copy of any of these is a crash rather than a size regression. Used only to
// improve the error message: anything outside PLUGIN_EXTERNALS is rejected regardless.
export const KNOWN_FORBIDDEN: readonly string[] = [
  'three',
  '@thatopen/components',
  '@thatopen/components-front',
  '@thatopen/fragments',
  'maplibre-gl',
  'lucide-react',
]
