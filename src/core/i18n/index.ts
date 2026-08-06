// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { pluginMessages } from '../plugins/messages'

import en from './messages/en.json'
import es from './messages/es.json'
import fr from './messages/fr.json'

const catalogs: Record<string, Record<string, unknown>> = { en, fr, es }

/**
 * Core message catalogs keyed by lowercase locale code.
 * The consuming app merges these under its own messages so that:
 *   1. App-level overrides win (same key in app beats core).
 *   2. Core's EN catalog backfills namespaces a locale hasn't translated yet.
 *
 * Plugin-owned catalogs are folded in here under a top-level `plugins` key, so a
 * plugin's strings resolve at `plugins.<slug>.<key>`. The nesting is what stops a
 * plugin colliding with a core namespace, or with another plugin. Plugins are
 * spread after any `plugins` block core itself defines, so each plugin owns its
 * own subtree and nothing else writes there.
 */
export const coreMessages: Record<string, Record<string, unknown>> = Object.fromEntries(
  Object.entries(catalogs).map(([locale, messages]) => [
    locale,
    {
      ...messages,
      plugins: {
        ...(messages.plugins as Record<string, unknown> | undefined),
        ...pluginMessages[locale],
      },
    },
  ]),
)
