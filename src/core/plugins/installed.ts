// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as helloBim from './hello-bim'
import * as helloMap from './hello-map'
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
 * To add a plugin: add its manifest to `manifests.ts`, import its entry here, and
 * pair the two. To disable one: comment it out.
 *
 * Manifests live in `manifests.ts` rather than here because the i18n layer needs
 * to read them without importing plugin components — see the note in that file.
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
  { manifest: manifestFor('hello-map'), entry: helloMap },
  { manifest: manifestFor('hello-bim'), entry: helloBim },
]
