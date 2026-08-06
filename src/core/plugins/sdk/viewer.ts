'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Viewer access for plugins — one import for all three engines.
 *
 * Deliberately **not** re-exported from the `plugins-sdk` barrel: `bimViewer`
 * carries a runtime dependency on `@thatopen/components` and three, which the BIM
 * viewer is code-split away from the eager bundle to avoid. Importing this barrel
 * accepts that weight, which is fine for a plugin (its bundle is loaded
 * separately) but not for core's map route — core imports the narrow modules.
 *
 * A plugin that only touches the map should import `plugins-sdk/mapViewer`
 * instead, and stay light.
 */

export * from './mapViewer'
export * from './bimViewer'
export * from './pointCloudViewer'
