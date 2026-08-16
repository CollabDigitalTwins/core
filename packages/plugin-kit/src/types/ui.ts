// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { CapabilityRegistry, PluginContext } from './base'

// The three surfaces that name no viewer library: a data page, a viewer sidebar tab and a
// dialog. Their registration shapes live in `base`, so this entry exists to give them a
// context alias of their own rather than sending an author to the map or legend entry.

export * from './base'

/** `CapabilityRegistry` for the surfaces that bind no viewer props. */
export type UiCapabilityRegistry = CapabilityRegistry

/** The `activate()` context for a plugin contributing pages, tabs or dialogs. */
export type UiPluginContext = PluginContext
