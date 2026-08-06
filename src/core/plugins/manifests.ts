// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import helloBimManifest from './hello-bim/manifest.json'
import helloMapManifest from './hello-map/manifest.json'

import type { PluginManifest } from './sdk/types'

/**
 * The manifests of the plugins compiled into this build.
 *
 * Deliberately separate from `installed.ts`, which pairs each manifest with its
 * *entry module*. Importing an entry pulls in that plugin's components, and
 * through them React, the SDK and — for a BIM plugin — `@thatopen` and three.
 * `src/core/i18n/index.ts` needs the manifests to collect plugin strings, and it
 * is reachable from the server graph through the `./messages` export, so it must
 * be able to read them without dragging a viewer engine along.
 *
 * Manifests are plain JSON. This module has no runtime dependencies at all.
 */
export const PLUGIN_MANIFESTS: PluginManifest[] = [
  helloMapManifest as PluginManifest,
  helloBimManifest as PluginManifest,
]
