// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { effectiveStatus } from './pluginStatus'
import { publishState } from './publishState'

import type { PublishState } from './publishState'
import type { PluginListing, RegistryPlugin } from '../types'

/** One plugin on the page: what this organization has of it and what the registry holds, joined by slug. */
export interface PluginRowData {
  slug: string
  listing?: PluginListing
  entry?: RegistryPlugin
}

export type PluginsTab = 'all' | 'running' | 'installed' | 'notInstalled' | 'registry'

/** What the registry viewer may do here; null for anyone outside the dev team. */
export interface DevTeamView {
  canGrant: boolean
  canPublishFromDisk: boolean
}

export type RegistryStanding =
  | PublishState
  | { kind: 'published'; version: string | null }
  | { kind: 'shared'; version: string }

export function mergePluginRows(listings: PluginListing[], registryPlugins: RegistryPlugin[]): PluginRowData[] {
  const rows = new Map<string, PluginRowData>()
  for (const listing of listings) rows.set(listing.manifest.slug, { slug: listing.manifest.slug, listing })
  for (const entry of registryPlugins) rows.set(entry.slug, { ...rows.get(entry.slug), slug: entry.slug, entry })
  return [...rows.values()]
}

/** `all` is every row some other shown tab lists, so it never reveals a row the viewer's tabs hide. */
export function isInTab(row: PluginRowData, tab: PluginsTab, shown: readonly PluginsTab[]): boolean {
  const status = row.listing ? effectiveStatus(row.listing) : null
  if (tab === 'all') return shown.some(other => other !== 'all' && isInTab(row, other, shown))
  if (tab === 'running') return status === 'running'
  if (tab === 'installed') return status !== null && status !== 'available'
  if (tab === 'notInstalled') return status === 'available'
  return Boolean(row.entry)
}

export function isMine(row: PluginRowData): boolean {
  return row.entry?.ownedByMe ?? false
}

export function matchesSearch(row: PluginRowData, needle: string): boolean {
  if (!needle) return true
  const manifest = row.listing?.manifest
  const haystack = [
    row.slug,
    manifest?.name ?? row.entry?.name ?? '',
    manifest?.description ?? row.entry?.description ?? '',
    ...(manifest?.capabilities ?? []),
  ]
  return haystack.some(text => text.toLowerCase().includes(needle))
}

/** Where the plugin stands with the registry, from the dev team's view when they have one. */
export function registryStanding(
  row: PluginRowData,
  devTeam: DevTeamView | null,
): RegistryStanding | null {
  if (devTeam?.canPublishFromDisk && row.listing?.mountPath) return publishState(row.listing.manifest, row.entry, devTeam.canGrant)
  if (devTeam && row.entry) return { kind: 'published', version: row.entry.latestVersion }
  if (row.listing?.registryVersion) return { kind: 'shared', version: row.listing.registryVersion }
  return null
}
