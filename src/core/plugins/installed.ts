// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { PLUGIN_MANIFESTS } from './manifests'

import type { PluginManifest, PluginSource } from './sdk/types'

/** Looked up by slug, not by position: reordering `manifests.ts` must not mispair. */
function manifestFor(slug: string): PluginManifest {
  const manifest = PLUGIN_MANIFESTS.find(candidate => candidate.slug === slug)
  if (!manifest) throw new Error(`No manifest registered in manifests.ts for plugin "${slug}"`)
  return manifest
}

/**
 * The plugins compiled into this build of core, in load order.
 *
 * To add a plugin: add its manifest to `manifests.ts`, then add an entry here
 * pairing that slug with a dynamic import of its module. To disable one: comment
 * it out.
 *
 * **Entries are dynamic imports, not static ones.** `installed.ts` is reachable
 * from `PluginHostProvider`, which sits in every route's provider tree — so a
 * static import would pull every plugin's components into the eager bundle, and
 * for a BIM plugin that means `@thatopen` and three on the map route, undoing the
 * code splitting the viewers are careful about. The host resolves these at
 * activation time, client-side, so each plugin lands in its own chunk.
 *
 * Manifests stay in `manifests.ts` because the i18n layer needs to read plugin
 * strings without importing plugin components at all — see the note there.
 *
 * This is the default only. A consumer can pass its own list — including one
 * resolved at runtime — via `<PluginHostProvider plugins={...}>`, and enable or
 * disable individual plugins per organization and per user with `enabledSlugs`.
 *
 * The two `hello-*` plugins are the documentation's worked examples and double as
 * the boundary's regression test: they import nothing outside `sdk/`, so if the
 * plugin surface stops being sufficient, they stop compiling.
 */
export const INSTALLED_PLUGINS: PluginSource[] = [
  { manifest: manifestFor('hello-map'), entry: () => import('./hello-map') },
  { manifest: manifestFor('hello-bim'), entry: () => import('./hello-bim') },
]
