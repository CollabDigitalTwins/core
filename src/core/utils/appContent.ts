// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../types/dbTypes'

import type { Organization } from '../types/dbTypes'

/** Everything an organization can switch on. The map is always available and is not listed. */
const OPTIONAL_VIEWERS: ViewerNames[] = [
  ViewerNames.extensions,
  ViewerNames.bim,
  ViewerNames.pointcloud,
  ViewerNames.sites,
  ViewerNames.infrastructure,
  ViewerNames.buildings,
  ViewerNames.files,
]

/**
 * The viewers an organization has switched on.
 *
 * An empty `appContent` means "not configured", which grants everything rather than nothing, so
 * an organization that never set the field keeps the full app. The map is always included.
 *
 * Shared so every entry point into a viewer agrees: the sidebar and the map popover's tool row
 * were drifting, and a tool that navigates somewhere the sidebar hides is a dead end.
 */
export function resolveAppContent(organization?: Organization | null): ViewerNames[] {
  const configured = organization?.appContent ?? []
  if (configured.length === 0) return [ViewerNames.map, ...OPTIONAL_VIEWERS]
  return [ViewerNames.map, ...(configured as ViewerNames[])]
}

/** Whether an organization can reach a viewer at all. */
export function hasAppContent(
  organization: Organization | null | undefined,
  viewer: ViewerNames,
): boolean {
  return resolveAppContent(organization).includes(viewer)
}
