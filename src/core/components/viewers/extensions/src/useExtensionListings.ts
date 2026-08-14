'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginHost, usePluginsReady } from '../../../../plugins/host/provider'
import { INSTALLED_PLUGINS } from '../../../../plugins/installed'

import type { ExtensionListing } from '../types'

/**
 * The rows to show: `listings` from the app, which is authoritative, plus anything
 * the host knows about that the app did not mention.
 */
export function useExtensionListings(listings?: ExtensionListing[]): ExtensionListing[] {
  const host = usePluginHost()
  // Re-derive once loading finishes: statuses are only meaningful after that.
  const ready = usePluginsReady()

  return React.useMemo(() => {
    const provided = listings ?? []
    const seen = new Set(provided.map(listing => listing.manifest.slug))
    const statuses = new Map(host?.listPlugins().map(p => [p.slug, p]) ?? [])

    // The app fetched before the host finished loading, so its status is a guess.
    const merged: ExtensionListing[] = provided.map(listing => {
      const live = statuses.get(listing.manifest.slug)
      if (!live) return listing
      return { ...listing, ...statusFields(live.status, live.error, listing) }
    })

    for (const { manifest } of INSTALLED_PLUGINS) {
      if (seen.has(manifest.slug)) continue
      const live = statuses.get(manifest.slug)

      merged.push({
        manifest,
        installed: true,
        orgEnabled: true,
        allowUserOverride: true,
        userEnabled: null,
        bundled: true,
        ...statusFields(live?.status, live?.error, null),
      })
    }

    return merged
  }, [listings, host, ready])
}

/** Maps a host status onto the row's `status` / `error`. */
function statusFields(
  hostStatus: 'active' | 'inactive' | 'errored' | undefined,
  error: string | undefined,
  listing: ExtensionListing | null,
): Pick<ExtensionListing, 'status' | 'error'> {
  if (hostStatus === 'errored') return { status: 'error', error }
  if (hostStatus === 'active') return { status: 'running' }

  // Not loaded. "Nobody switched it on" and "not added here" need different controls.
  if (listing && !listing.installed) return { status: 'available' }
  return { status: 'off' }
}

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
