'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginHost, usePluginsReady } from '../../../../plugins/host/provider'
import { INSTALLED_PLUGINS } from '../../../../plugins/installed'

import type { ExtensionListing } from '../types'

/**
 * The rows to show, from whatever the app was able to tell us.
 *
 * Two sources, in order of authority:
 *
 * 1. `listings` from the app — manifests crossed with `PluginInstallation` and
 *    `PluginUserSetting`. Authoritative once persistence exists.
 * 2. The plugin host — every plugin compiled into this build, with its live status.
 *    Always available, needs no database, and is the only source until then.
 *
 * Anything the host knows about that the app did not mention is appended, so a
 * bundled plugin is never invisible just because it has no install row yet.
 */
export function useExtensionListings(listings?: ExtensionListing[]): ExtensionListing[] {
  const host = usePluginHost()
  // Re-derive once loading finishes: statuses are only meaningful after that.
  const ready = usePluginsReady()

  return React.useMemo(() => {
    const provided = listings ?? []
    const seen = new Set(provided.map(listing => listing.manifest.slug))
    const statuses = new Map(host?.listPlugins().map(p => [p.slug, p]) ?? [])

    // Refresh the live status of provided rows — the app fetched its data before
    // the host finished loading, so its status field is a guess.
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
        // A plugin compiled into core is present by definition. Until an install
        // row exists it is treated as available and on, which is what the app did
        // before any of this had a database.
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

  // Not loaded. Distinguish "nobody switched it on" from "not added here at all",
  // because the two need different controls.
  if (listing && !listing.installed) return { status: 'available' }
  return { status: 'off' }
}

/**
 * The status to show, given the row's enablement.
 *
 * The host's status describes what is loaded *right now*, which lags a toggle:
 * flipping "run this for me" off leaves the plugin loaded until the provider
 * reconciles, and until persistence exists it may never reload at all. Reading
 * the switches instead means the badge answers the question the user just asked.
 *
 * Errors and not-yet-added win over enablement — neither is something a switch
 * can change.
 */
export function effectiveStatus(listing: ExtensionListing): ExtensionListing['status'] {
  if (listing.status === 'error') return 'error'
  if (!listing.installed) return 'available'

  const enabled = listing.allowUserOverride && listing.userEnabled !== null
    ? listing.userEnabled
    : listing.orgEnabled

  return enabled ? 'running' : 'off'
}
