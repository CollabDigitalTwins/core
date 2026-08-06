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
 * One row on the extensions page: the plugin's manifest plus the state that
 * decides whether it runs for the person looking at it.
 *
 * The org fields mirror `PluginInstallation`, `userEnabled` mirrors
 * `PluginUserSetting`. Both are supplied by the app, so this component works the
 * same whether that state comes from the database or, for now, from defaults.
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
 * The writes the page can perform.
 *
 * A port, like `ApiAdapter`: core defines it, the app implements it against its
 * own routes. Omitting it renders the page read-only, which is what happens until
 * the persistence tables land — the controls stay visible so the page is
 * reviewable, and explain themselves instead of silently doing nothing.
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
 * What the signed-in user is allowed to change, resolved from CASL once so the
 * card does not re-derive it per control.
 *
 * Hiding a control is presentation only. Every one of these writes is re-checked
 * server-side, and the user-settings routes take the user id from the session
 * rather than the request, so a crafted request gets a 403.
 */
export interface ExtensionsAbility {
  /** `create` / `delete PluginInstallation` — add or remove for the organization. */
  canInstall: boolean
  /** `update PluginInstallation` — change the default or lock the choice. */
  canConfigureOrg: boolean
  /** `update PluginUserSetting` — choose for oneself. */
  canChooseForSelf: boolean
}
