// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { ExtensionListing } from '../types'

/**
 * The status to show, read from the switches rather than the host. The host's status
 * describes what is loaded right now, which lags a toggle; reading the switches means
 * the badge answers the question the user just asked. Errors and not-yet-added win,
 * since no switch changes either.
 */
export function effectiveStatus(listing: ExtensionListing): ExtensionListing['status'] {
  if (listing.status === 'error') return 'error'
  if (!listing.installed) return 'available'

  const enabled = listing.allowUserOverride && listing.userEnabled !== null
    ? listing.userEnabled
    : listing.orgEnabled

  return enabled ? 'running' : 'off'
}
