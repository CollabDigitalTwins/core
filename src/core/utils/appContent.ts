// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../types/dbTypes'

import type { Organization } from '../types/dbTypes'

/** Viewers every organization has, whatever its `appContent` says, so they are never stored in it. */
export const ALWAYS_AVAILABLE_VIEWERS: readonly ViewerNames[] = [
  ViewerNames.map,
  ViewerNames.plugins,
  ViewerNames.settings,
]

const OPTIONAL_VIEWERS: ViewerNames[] = [
  ViewerNames.bim,
  ViewerNames.sites,
  ViewerNames.infrastructure,
  ViewerNames.buildings,
  ViewerNames.files,
]

/**
 * The viewers an organization can reach. An empty `appContent` means "not configured" and grants
 * every optional viewer; the always-available ones are included either way.
 */
export function resolveAppContent(organization?: Organization | null): ViewerNames[] {
  const configured = organization?.appContent ?? []
  const optional = configured.length === 0 ? OPTIONAL_VIEWERS : (configured as ViewerNames[])
  return [...new Set([...ALWAYS_AVAILABLE_VIEWERS, ...optional])]
}

/** Whether an organization can reach a viewer at all. */
export function hasAppContent(
  organization: Organization | null | undefined,
  viewer: ViewerNames,
): boolean {
  return resolveAppContent(organization).includes(viewer)
}
