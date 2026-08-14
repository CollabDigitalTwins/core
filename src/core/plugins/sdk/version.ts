// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * The plugin host contract version — the compatibility promise, kept separate from
 * the package version so core can ship releases without moving it.
 *
 * Bump only on a change that breaks a correctly-written plugin: a removed capability,
 * a changed registration shape, a changed SDK export. Additions do not bump it. The
 * host refuses to activate a plugin whose manifest declares a different `hostApi`.
 */
export const PLUGIN_HOST_API = 1
