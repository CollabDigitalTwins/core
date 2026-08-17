// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { ViewerKey } from '../../types/dbTypes'

const PREFIX = 'plugin:'

export interface PluginViewerTarget {
  pluginId: string
  pageId: string
}

/**
 * The `viewer` value that routes to one plugin's data page. Namespaced the same way toolbar
 * tool ids already are, so a plugin page and a built-in one can never collide.
 */
export function pluginViewerKey(pluginId: string, pageId: string): ViewerKey {
  return `${PREFIX}${pluginId}:${pageId}`
}

/** Null, not a throw, for a built-in or malformed key: this value comes from the URL. */
export function parsePluginViewerKey(key: string | null | undefined): PluginViewerTarget | null {
  if (typeof key !== 'string' || !key.startsWith(PREFIX)) return null

  const separator = key.indexOf(':', PREFIX.length)
  if (separator === -1) return null

  const pluginId = key.slice(PREFIX.length, separator)
  const pageId = key.slice(separator + 1)

  if (!pluginId || !pageId) return null

  return { pluginId, pageId }
}
