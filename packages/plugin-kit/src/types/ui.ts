// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { CapabilityRegistry, PluginContext } from './base'

// The surfaces that name no viewer library, so they share one entry and one context alias.

export * from './base'

/** `CapabilityRegistry` for the surfaces that bind no viewer props. */
export type UiCapabilityRegistry = CapabilityRegistry

/** The `activate()` context for a plugin contributing pages, tabs or dialogs. */
export type UiPluginContext = PluginContext
