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
 * The plugins compiled into this build of core, in load order. To add one: put its
 * manifest in `manifests.ts`, then pair that slug with a dynamic import here.
 *
 * Entries must stay dynamic imports. `installed.ts` is reachable from
 * `PluginHostProvider`, which sits in every route's provider tree, so a static
 * import would put every plugin's components — `@thatopen` and three among them —
 * in the eager bundle. Resolved at activation time instead, one chunk each.
 *
 * A default only: a consumer can pass its own list via
 * `<PluginHostProvider plugins={...}>` and gate it with `enabledSlugs`.
 *
 * The `hello-*` pair are the documentation's worked examples and the boundary's
 * regression test — they import nothing outside `sdk/`, so an insufficient plugin
 * surface stops them compiling.
 */
export const INSTALLED_PLUGINS: PluginSource[] = [
  { manifest: manifestFor('hello-map'), entry: () => import('./hello-map') },
  { manifest: manifestFor('hello-bim'), entry: () => import('./hello-bim') },
  { manifest: manifestFor('hello-everywhere'), entry: () => import('./hello-everywhere') },
]
