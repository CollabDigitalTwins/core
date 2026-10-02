// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PluginManifest } from '../../../plugins/sdk/types'

/** Why a plugin is or is not currently contributing anything. */
export type PluginStatus =
  /** Loaded and contributing. */
  | 'running'
  /** Available here, but not switched on for this user. */
  | 'off'
  /** Tried to load and failed. `error` says why. */
  | 'error'
  /** Present on the server, not yet added to this organization. */
  | 'available'

/**
 * One row on the plugins page: the manifest plus the state deciding whether it
 * runs for the person looking at it. The org fields mirror `PluginInstallation`,
 * `userEnabled` mirrors `PluginUserSetting`.
 */
export interface PluginListing {
  manifest: PluginManifest
  status: PluginStatus
  /** Message from `PluginHost.getError()`, present only when status is 'error'. */
  error?: string

  /** Added to this organization at all. */
  installed: boolean
  /** The organization's default. */
  orgEnabled: boolean
  /** Whether a user may deviate from that default. */
  allowUserOverride: boolean
  /** This user's own choice; null when they have not made one. */
  userEnabled: boolean | null

  /**
   * Compiled into this build of core rather than mounted from disk. Says where the
   * code came from, nothing about whether it runs: a bundled plugin is added,
   * enabled and removed by an admin like any other.
   */
  bundled: boolean
  /** Where a mounted plugin was found, shown before an admin adds it. */
  mountPath?: string
  /** Set when the plugin comes from the shared plugin registry: the version granted to this organization. */
  registryVersion?: string
}

/**
 * The writes the page can perform. A port like `ApiAdapter`: core defines it, the
 * app implements it against its own routes. Omitting it renders the page read-only.
 */
export interface PluginsActions {
  /** Add to, or remove from, this organization. Admin only. */
  setInstalled(pluginId: string, installed: boolean): Promise<void>
  /** Change the organization default. Admin only. */
  setOrgEnabled(pluginId: string, enabled: boolean): Promise<void>
  /** Allow or prevent per-user choice. Admin only. */
  setAllowUserOverride(pluginId: string, allow: boolean): Promise<void>
  /** The signed-in user's own choice. Any user with the permission. */
  setUserEnabled(pluginId: string, enabled: boolean): Promise<void>
}

/**
 * What the signed-in user may change, resolved from CASL once rather than per
 * control. Presentation only: every write is re-checked server-side, and the
 * user-settings routes take the user id from the session, not the request.
 */
export interface PluginsAbility {
  /** `create` / `delete PluginInstallation` — add or remove for the organization. */
  canInstall: boolean
  /** `update PluginInstallation` — change the default or lock the choice. */
  canConfigureOrg: boolean
  /** `update PluginUserSetting` — choose for oneself. */
  canChooseForSelf: boolean
}

export interface RegistryVersion {
  version: string
  status: 'PUBLISHED' | 'YANKED'
  hostApi: number
  sizeBytes: number
  sha256: string
  publishedAt: string
  publishedBy: string
}

export interface RegistryGrant {
  organizationId: number
  organizationName: string
  /** Null runs the newest published version. */
  pinnedVersion: string | null
  resolvedVersion: string | null
}

/** One plugin in the shared registry, as the dev team sees it. `grants` is present for platform admins only. */
export interface RegistryPlugin {
  slug: string
  name: string
  description: string | null
  icon: string | null
  owner: { name: string; email: string }
  ownedByMe: boolean
  latestVersion: string | null
  versions: RegistryVersion[]
  grants?: RegistryGrant[]
}

export interface RegistryState {
  /** True for the dev team, and for an org admin with grants; `viewer.canPublish` tells them apart. */
  configured: boolean
  viewer?: { email: string; canPublish: boolean; canGrant: boolean }
  plugins: RegistryPlugin[]
  error?: { code: string; message: string }
}

export interface RegistryOrganization {
  id: number
  name: string
  title: string | null
}

/** Registry writes, a port like `PluginsActions`. Every one is re-checked by the registry. */
export interface RegistryActions {
  publishMounted(slug: string): Promise<{ version: string; claimed: boolean }>
  removeVersion(slug: string, version: string): Promise<{ outcome: 'deleted' | 'yanked' }>
  removePlugin(slug: string): Promise<void>
  listOrganizations(): Promise<RegistryOrganization[]>
  /** Grants or re-pins access; `pinnedVersion` null runs the newest published version. */
  setGrant(slug: string, organizationId: number, pinnedVersion: string | null): Promise<void>
  revokeGrant(slug: string, organizationId: number): Promise<void>
}
