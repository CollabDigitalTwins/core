// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PluginListing, PluginsAbility } from '../types'

/**
 * The status to show, read from the switches: the host's status lags a toggle, so this answers what
 * the user just asked. Errors and not-yet-added win, since no switch changes either.
 */
export function effectiveStatus(listing: PluginListing): PluginListing['status'] {
  if (listing.status === 'error') return 'error'
  if (!listing.installed) return 'available'

  const enabled = listing.allowUserOverride && listing.userEnabled !== null
    ? listing.userEnabled
    : listing.orgEnabled

  return enabled ? 'running' : 'off'
}

export type UserChoice = 'choose' | 'nothingToRun' | 'readOnly' | 'lockedOn' | 'lockedOff'

/** Whether the viewer may pick for themselves, and if not, which reason to give. */
export function userChoice(listing: PluginListing, ability: Pick<PluginsAbility, 'canChooseForSelf'>): UserChoice {
  if (effectiveStatus(listing) === 'error') return 'nothingToRun'
  if (listing.allowUserOverride && ability.canChooseForSelf) return 'choose'
  if (!ability.canChooseForSelf) return 'readOnly'
  return listing.orgEnabled ? 'lockedOn' : 'lockedOff'
}
