'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useMessages, useTranslations } from 'next-intl'
import * as React from 'react'

import { usePluginId } from '../host/scope'

/**
 * Translations for plugin-supplied text.
 *
 * A plugin ships `messages/{locale}.json`, merged into the app's message tree
 * under `plugins.<pluginId>`. That merge already gives two of the three fallback
 * layers for free (see `cdt-na/src/i18n/request.ts`):
 *
 *   core EN → core locale → plugin EN → plugin locale → app overrides
 *
 * The third layer is the one this module adds: a plugin may ship **no** catalog at
 * all, or ship one missing the key. Rather than render `plugins.foo.name` at the
 * user, fall back to the literal string in the plugin's manifest — which is the
 * author's own text, and in practice English. A plugin with no translations is
 * therefore usable, just untranslated.
 */

/** Reads `plugins.<pluginId>.<key>` out of the merged catalog, if it is there. */
function lookupPluginMessage(
  messages: Record<string, unknown> | undefined,
  pluginId: string,
  key: string,
): string | undefined {
  const plugins = messages?.plugins
  if (typeof plugins !== 'object' || plugins === null) return undefined

  const own = (plugins as Record<string, unknown>)[pluginId]
  if (typeof own !== 'object' || own === null) return undefined

  // Dotted keys address nested groups, e.g. 'spaces.title'.
  let node: unknown = own
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }

  return typeof node === 'string' && node.length > 0 ? node : undefined
}

/**
 * One piece of plugin-supplied text, with the manifest string as the fallback.
 *
 * Use this for anything core renders *on a plugin's behalf* — its name,
 * description, the label on a contributed tool — so an untranslated plugin shows
 * the author's own wording instead of a raw message key.
 *
 * `fallback` is what the plugin declared in its manifest. It is returned verbatim
 * when the plugin ships no catalog entry for `key`.
 */
export function usePluginMessage(pluginId: string, key: string, fallback: string): string {
  const messages = useMessages() as Record<string, unknown> | undefined

  return React.useMemo(
    () => lookupPluginMessage(messages, pluginId, key) ?? fallback,
    [messages, pluginId, key, fallback],
  )
}

export type PluginTranslator = (key: string, fallback?: string) => string

/**
 * A `t()` scoped to the calling plugin's own namespace.
 *
 * Only valid inside a plugin subtree — the namespace comes from the plugin scope
 * its capability host established, so a plugin cannot read another's strings.
 * Pass a `fallback` for any key the plugin might not have translated yet;
 * without one, a missing key renders as `plugins.<pluginId>.<key>` rather than
 * throwing, matching the app's `getMessageFallback`.
 */
export function usePluginTranslations(): PluginTranslator {
  const pluginId = usePluginId()
  const messages = useMessages() as Record<string, unknown> | undefined

  return React.useCallback(
    (key: string, fallback?: string) =>
      lookupPluginMessage(messages, pluginId, key)
      ?? fallback
      ?? `plugins.${pluginId}.${key}`,
    [messages, pluginId],
  )
}

/**
 * Core's own strings, for components that render plugin UI.
 *
 * Thin re-export so a capability host has one obvious import rather than reaching
 * for `next-intl` directly, and so core strings and plugin strings are visibly
 * different calls at the point of use.
 */
export function useCoreTranslations(namespace: string) {
  return useTranslations(namespace)
}

export { lookupPluginMessage as __lookupPluginMessage }
