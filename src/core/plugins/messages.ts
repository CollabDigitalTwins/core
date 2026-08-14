// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { PLUGIN_MANIFESTS } from './manifests'

/**
 * Plugin-owned strings, re-keyed from `manifest.messages[locale][key]` into
 * `locale → slug → key`, the shape `coreMessages` needs. Keeping them in the
 * manifest makes a plugin one file to write and one to hand a translator, and lets
 * mounted plugins resolve identically at `plugins.<slug>.<key>`.
 *
 * A plugin with no `messages` contributes nothing and falls back to the inline
 * English its components pass to `usePluginTranslations`.
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
