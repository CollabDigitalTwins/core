// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { parsePluginViewerKey } from '../../plugins/host/pluginViewerKey'

import type { ViewerKey, ViewerNames } from '../../types/dbTypes'

/**
 * Whether this organization may show the requested viewer.
 *
 * `appContent` is a Prisma enum array, so it can never contain a plugin key. A plugin page
 * is gated by plugin enablement instead — the host only registers a `data.pages`
 * contribution for a plugin that is running here. Without the first clause, every
 * organization with a non-empty `appContent` would send plugin pages back to the map.
 *
 * An empty `appContent` means the organization has not restricted anything.
 */
export function isViewerAllowed(viewer: ViewerKey, appContent: ViewerNames[]): boolean {
  if (parsePluginViewerKey(viewer) !== null) return true

  return appContent.length === 0 || appContent.includes(viewer as ViewerNames)
}
