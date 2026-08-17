'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useMessages, useTranslations } from 'next-intl'
import * as React from 'react'

import { usePluginId } from '../host/scope'

/**
 * Translations for plugin-supplied text.
 *
 * A plugin's catalog is merged under `plugins.<pluginId>`, giving the locale
 * fallbacks for free. What this module adds is the last one: a plugin may ship no
 * catalog, or one missing the key, and the manifest's own string is shown rather
 * than `plugins.foo.name`. An untranslated plugin stays usable.
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
 * For anything core renders on a plugin's behalf — its name, description, a
 * contributed tool's label.
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
 * A `t()` scoped to the calling plugin's namespace. Only valid inside a plugin
 * subtree, so a plugin cannot read another's strings. Without a `fallback`, a
 * missing key renders as `plugins.<pluginId>.<key>` rather than throwing.
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

export type PluginMessageLookup = (pluginId: string, key: string, fallback: string) => string

/**
 * Text for several plugins at once, for a host rendering a list of contributions — a hook
 * cannot be called per row. Host-side only; a plugin has `usePluginTranslations`.
 */
export function usePluginMessageLookup(): PluginMessageLookup {
  const messages = useMessages() as Record<string, unknown> | undefined

  return React.useCallback(
    (pluginId: string, key: string, fallback: string) =>
      lookupPluginMessage(messages, pluginId, key) ?? fallback,
    [messages],
  )
}

/** Core's own strings, kept a separate call so plugin and core text differ at the point of use. */
export function useCoreTranslations(namespace: string) {
  return useTranslations(namespace)
}

export { lookupPluginMessage as __lookupPluginMessage }
