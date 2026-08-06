// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * The plugin host contract version.
 *
 * This is the community's compatibility promise, and it is deliberately separate
 * from the package version: core can ship any number of releases without moving
 * it, and a plugin built against API 1 keeps loading on all of them.
 *
 * Bump it only on a change that breaks a correctly-written plugin — removing a
 * capability, changing a registration shape, changing what the SDK exports.
 * Additive changes (a new capability, a new SDK hook) do NOT bump it.
 *
 * A plugin declares the API it was built against as `hostApi` in its manifest.
 * The host refuses to activate a plugin whose declared value differs, rather
 * than letting it fail somewhere less obvious at render time.
 */
export const PLUGIN_HOST_API = 1
