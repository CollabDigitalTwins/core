// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { PLUGIN_MANIFESTS } from './manifests'

/**
 * Plugin-owned strings, collected from every compiled-in manifest and re-keyed
 * from `manifest.messages[locale][key]` into `locale → slug → key`, which is the
 * shape `coreMessages` needs.
 *
 * Strings live in the manifest so a plugin is one file to write and one file to
 * hand a translator, rather than a folder of near-empty JSON per locale. The
 * runtime loader in Phase D reads the same field out of a mounted
 * `manifest.json`, so compiled-in and mounted plugins resolve identically at
 * `plugins.<slug>.<key>`.
 *
 * A plugin shipping no `messages` simply contributes nothing here and falls back
 * to the inline English its components pass to `usePluginTranslations`.
 */
export const pluginMessages: Record<string, Record<string, unknown>> = collectPluginMessages(PLUGIN_MANIFESTS)

export function collectPluginMessages(
  manifests: Array<{ slug: string; messages?: Record<string, Record<string, unknown>> }>,
): Record<string, Record<string, unknown>> {
  const byLocale: Record<string, Record<string, unknown>> = {}

  for (const { slug, messages } of manifests) {
    if (!messages) continue

    for (const [locale, strings] of Object.entries(messages)) {
      if (!strings || typeof strings !== 'object') continue
      byLocale[locale] ??= {}
      byLocale[locale][slug] = strings
    }
  }

  return byLocale
}
