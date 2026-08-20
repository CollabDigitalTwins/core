// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Surface } from './options'

export type ViewerTarget = 'map' | 'bim' | 'pointcloud'

/** The only three viewers that host a sidebar tab or a legend. */
export const ALL_VIEWERS: readonly ViewerTarget[] = ['map', 'bim', 'pointcloud']

// Which viewer a surface contributes to. Shared surfaces name none, so they are absent here.
const SURFACE_VIEWER: Partial<Record<Surface, ViewerTarget>> = {
  'map.tools': 'map',
  'map.layers': 'map',
  'bim.tools': 'bim',
  'pointcloud.tools': 'pointcloud',
}

/**
 * Which viewers a plugin's tabs and legends should target, read off the viewer surfaces it
 * contributes. Falls back to all three, which is what omitting the field already means.
 */
export function viewersFor(surfaces: readonly Surface[]): ViewerTarget[] {
  const named = new Set(surfaces.map(surface => SURFACE_VIEWER[surface]).filter(Boolean))

  if (named.size === 0) return [...ALL_VIEWERS]

  return ALL_VIEWERS.filter(viewer => named.has(viewer))
}

/** True when the plugin targets a viewer it contributes no tool or layer to. */
export function untooledViewers(surfaces: readonly Surface[]): ViewerTarget[] {
  const named = new Set(surfaces.map(surface => SURFACE_VIEWER[surface]).filter(Boolean))

  return ALL_VIEWERS.filter(viewer => !named.has(viewer))
}
