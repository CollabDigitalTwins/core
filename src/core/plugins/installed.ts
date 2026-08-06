// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PluginSource } from './sdk/types'

/**
 * The plugins compiled into this build of core, in load order.
 *
 * To add a plugin: import its manifest and entry, then push a new entry onto this array.
 *   import * as myPlugin from './my-plugin'
 *   import myManifest from './my-plugin/manifest.json'
 *   INSTALLED_PLUGINS.push({ manifest: myManifest as PluginManifest, entry: myPlugin })
 *
 * To disable a plugin: comment out or remove its entry.
 *
 * This is the default only. A consumer can pass its own list — including one
 * resolved at runtime — via `<PluginHostProvider plugins={...}>`, and enable or
 * disable individual plugins per deployment with `enabledSlugs`.
 */
export const INSTALLED_PLUGINS: PluginSource[] = []
