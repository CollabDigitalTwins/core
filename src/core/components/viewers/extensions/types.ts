// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PluginManifest } from '../../../plugins/sdk/types'

/** Why a plugin is or is not currently contributing anything. */
export type ExtensionStatus =
  /** Loaded and contributing. */
  | 'running'
  /** Available here, but not switched on for this user. */
  | 'off'
  /** Tried to load and failed. `error` says why. */
  | 'error'
  /** Present on the server, not yet added to this organization. */
  | 'available'

/**
 * One row on the extensions page: the manifest plus the state deciding whether it
 * runs for the person looking at it. The org fields mirror `PluginInstallation`,
 * `userEnabled` mirrors `PluginUserSetting`.
 */
export interface ExtensionListing {
  manifest: PluginManifest
  status: ExtensionStatus
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

  /** Compiled into this build of core rather than mounted. Cannot be removed. */
  bundled: boolean
  /** Where a mounted plugin was found, shown before an admin adds it. */
  mountPath?: string
}

/**
 * The writes the page can perform. A port like `ApiAdapter`: core defines it, the
 * app implements it against its own routes. Omitting it renders the page read-only.
 */
export interface ExtensionsActions {
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
export interface ExtensionsAbility {
  /** `create` / `delete PluginInstallation` — add or remove for the organization. */
  canInstall: boolean
  /** `update PluginInstallation` — change the default or lock the choice. */
  canConfigureOrg: boolean
  /** `update PluginUserSetting` — choose for oneself. */
  canChooseForSelf: boolean
}
