// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import en from './messages/en.json'
import es from './messages/es.json'
import fr from './messages/fr.json'

/**
 * Core message catalogs keyed by lowercase locale code.
 * The consuming app merges these under its own messages so that:
 *   1. App-level overrides win (same key in app beats core).
 *   2. Core's EN catalog backfills namespaces a locale hasn't translated yet.
 */
export const coreMessages: Record<string, Record<string, unknown>> = { en, fr, es }
