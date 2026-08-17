// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { parsePluginViewerKey } from '../../plugins/host/pluginViewerKey'

import type { Organization, ViewerKey, ViewerNames } from '../../types/dbTypes'

/**
 * Whether this organization may show the requested viewer. `appContent` is a Prisma enum and
 * can never hold a plugin key, so a plugin page is gated by enablement instead.
 */
export function isViewerAllowed(viewer: ViewerKey, appContent: Organization['appContent']): boolean {
  if (parsePluginViewerKey(viewer) !== null) return true

  return appContent.length === 0 || appContent.includes(viewer as ViewerNames)
}
