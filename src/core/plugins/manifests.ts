// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import helloBimManifest from './hello-bim/manifest.json'
import helloMapManifest from './hello-map/manifest.json'

import type { PluginManifest } from './sdk/types'

/**
 * The manifests of the plugins compiled into this build, separate from
 * `installed.ts` so they can be read without their entry modules.
 *
 * `i18n/index.ts` collects plugin strings and is reachable from the server graph
 * through the `./messages` export, so it must read manifests without dragging in a
 * plugin's components and, with them, a viewer engine. Plain JSON, no runtime deps.
 */
export const PLUGIN_MANIFESTS: PluginManifest[] = [
  helloMapManifest as PluginManifest,
  helloBimManifest as PluginManifest,
]
