// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { CapabilityRegistry, PluginContext } from './base'

// Names no external type, so this entry costs a plugin nothing to depend on.

export * from './base'

// `viewer` is `unknown` because Potree ships no types, and a fabricated interface would be
// worse than making the plugin narrow it.
export interface PointCloudToolProps {
  viewer: unknown
  /** False until Potree has finished initialising. */
  ready: boolean
}

/** `CapabilityRegistry` with the point-cloud surface bound. */
export type PointCloudCapabilityRegistry = CapabilityRegistry<unknown, unknown, PointCloudToolProps>

/** The `activate()` context for a plugin that contributes to the point-cloud toolbar. */
export type PointCloudPluginContext = PluginContext<unknown, unknown, PointCloudToolProps>
