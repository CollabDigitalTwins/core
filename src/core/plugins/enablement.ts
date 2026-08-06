// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Resolves which plugins run for one signed-in user, from the organization's
 * installations and that user's own settings.
 *
 * Two levels, with different owners:
 *
 * - **The organization installs.** This is what admits third-party code to the
 *   deployment at all. A mounted plugin runs with full app privileges, so nothing
 *   an individual user does can make an uninstalled plugin run.
 * - **The user opts in or out**, within what the organization allows. An admin can
 *   also take that choice away per plugin (`allowUserOverride: false`) when a
 *   plugin has to be on — or off — for everyone.
 *
 * Pure and framework-free so it can be unit tested and called from either side:
 * the app's route handler resolves this server-side and hands the result to
 * `<PluginHostProvider enabledSlugs configs>`.
 */

/** One organization-level install record. */
export interface OrgPluginInstallation {
  pluginId: string
  /** The organization's default for this plugin. */
  enabled: boolean
  /** Whether a user may deviate from that default. */
  allowUserOverride: boolean
  /** Organization-level settings. */
  config?: Record<string, unknown> | null
}

/** One user's setting for a plugin. Only meaningful if the org installed it. */
export interface UserPluginSetting {
  pluginId: string
  enabled: boolean
  /** Per-user overrides, layered over the organization's config. */
  config?: Record<string, unknown> | null
}

export interface ResolvedPluginEnablement {
  /** Pass straight to `PluginHostProvider`'s `enabledSlugs`. */
  enabledSlugs: string[]
  /** Pass straight to `PluginHostProvider`'s `configs`. */
  configs: Record<string, Record<string, unknown>>
}

/**
 * | installed | allowUserOverride | user setting | result       |
 * |-----------|-------------------|--------------|--------------|
 * | no        | –                 | anything     | off          |
 * | yes, off  | false             | anything     | off          |
 * | yes, off  | true              | on           | on (opt-in)  |
 * | yes, off  | true              | absent       | off          |
 * | yes, on   | false             | anything     | on (forced)  |
 * | yes, on   | true              | off          | off (opt-out)|
 * | yes, on   | true              | absent       | on           |
 *
 * A user setting for a plugin the organization has not installed is ignored, not
 * honoured — that is the property that keeps the org the gatekeeper of which code
 * may run.
 */
export function resolvePluginEnablement(
  installations: OrgPluginInstallation[],
  userSettings: UserPluginSetting[] = [],
): ResolvedPluginEnablement {
  const settingsByPlugin = new Map(userSettings.map(setting => [setting.pluginId, setting]))

  const enabledSlugs: string[] = []
  const configs: Record<string, Record<string, unknown>> = {}

  for (const installation of installations) {
    const { pluginId, enabled, allowUserOverride } = installation
    const setting = settingsByPlugin.get(pluginId)

    const effective = allowUserOverride && setting ? setting.enabled : enabled
    if (!effective) continue

    enabledSlugs.push(pluginId)

    // Shallow merge, user over organization. Shallow on purpose: plugin config is
    // a flat settings bag, and a user overriding a nested object should replace it
    // outright rather than have their value silently merged into the admin's.
    const orgConfig = installation.config ?? {}
    const userConfig = (allowUserOverride && setting?.config) || {}
    configs[pluginId] = { ...orgConfig, ...userConfig }
  }

  return { enabledSlugs, configs }
}
