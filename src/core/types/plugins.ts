// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Persisted plugin state, as core sees it.
 *
 * Mirrors the `PluginInstallation`, `PluginUserSetting` and `PluginRecord` tables
 * in the platform database, but core does not know about Prisma — the app maps
 * its rows onto these through the usual `prismaToCore` adapters, exactly as it
 * does for buildings and sensors.
 *
 * `pluginId` is the manifest slug throughout, and is deliberately not a foreign
 * key: uninstalling a plugin must not destroy the data it wrote.
 */

/** What an organization has admitted, and how it defaults. Admin-owned. */
export interface PluginInstallation {
  id: number
  pluginId: string
  /** The organization's default for this plugin. */
  enabled: boolean
  /** Whether a user may deviate from that default, in either direction. */
  allowUserOverride: boolean
  /** Organization-level settings, shaped by the manifest's `configSchema`. */
  config: Record<string, unknown> | null
  /** Manifest version at install time, so a behaviour change is detectable. */
  version: string | null
  installedAt: string | Date
  updatedAt: string | Date
  organizationId: number
  installedById: number | null
}

/** One user's own choice for one plugin. Honoured only when the install allows it. */
export interface PluginUserSetting {
  id: number
  pluginId: string
  enabled: boolean
  /** Per-user overrides, layered over the organization's config. */
  config: Record<string, unknown> | null
  createdAt: string | Date
  updatedAt: string | Date
  userId: number
}

/**
 * A document a plugin owns, namespaced by `(pluginId, collection, key)` within an
 * organization. `key` is the plugin's own stable identifier, which is what makes
 * a write an upsert rather than an append.
 */
export interface PluginRecord {
  id: number
  pluginId: string
  collection: string
  key: string
  data: unknown
  createdAt: string | Date
  updatedAt: string | Date
  organizationId: number
  authorId: number | null
}
