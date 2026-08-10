// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { CapabilityRegistry, PluginContext } from './base'

/**
 * The point-cloud viewer, as a plugin sees it.
 *
 * No external types at all, so this entry costs a plugin nothing to depend on.
 */

export * from './base'

/**
 * `viewer` is deliberately `unknown`: Potree has no bundled types, and handing a
 * plugin author a fabricated interface would be worse than making them narrow it.
 * `ready` is false until Potree has finished initialising.
 */
export interface PointCloudToolProps {
  viewer: unknown
  ready: boolean
}

/** `CapabilityRegistry` with the point-cloud surface bound. */
export type PointCloudCapabilityRegistry = CapabilityRegistry<unknown, unknown, PointCloudToolProps>

/** The `activate()` context for a plugin that contributes to the point-cloud toolbar. */
export type PointCloudPluginContext = PluginContext<unknown, unknown, PointCloudToolProps>
