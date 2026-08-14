'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * A plugin's own configuration and identity.
 *
 * Re-exported from the scope module rather than from the plugin host on purpose.
 * `installed.ts` imports plugin components, so anything a plugin component
 * imports must not reach back to the host — that cycle leaves the bindings
 * undefined by the time the plugin renders.
 */
export { usePluginConfig, usePluginId } from '../host/scope'
