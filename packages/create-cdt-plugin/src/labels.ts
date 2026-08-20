// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Surface } from './options'

export interface SurfaceLabel {
  /** The prompt row. Names the place, not the capability id. */
  label: string
  /** The hint under the highlighted row: where it shows up, and what the component gets. */
  description: string
}

// Kept out of cli.ts so a test can assert it covers SURFACES without executing the CLI.
export const SURFACE_LABELS: Record<Surface, SurfaceLabel> = {
  'map.tools': {
    label: 'Map toolbar',
    description: 'A button and dropdown panel in the map viewer. Receives the MapLibre map.',
  },
  'bim.tools': {
    label: 'BIM toolbar',
    description: 'A button and dropdown panel in the BIM viewer. Receives the model and selection.',
  },
  'pointcloud.tools': {
    label: 'Point cloud toolbar',
    description: 'A button and dropdown panel in the point cloud viewer. Receives the Potree viewer.',
  },
  'viewer.legends': {
    label: 'Viewer legend',
    description: 'Rows in the viewer legend panel. Registers a hook, so counts can stay live.',
  },
  'map.layers': {
    label: 'Map layer',
    description: 'Drawn on the map for as long as the map exists, so it survives the toolbar closing.',
  },
  'data.pages': {
    label: 'Data page',
    description: 'A full page under the Datasets nav. You supply a rows hook and columns.',
  },
  'viewer.tabs': {
    label: 'Viewer sidebar tab',
    description: 'A tab in the viewer sidebar. The platform owns the tab strip and panel frame.',
  },
  'ui.dialogs': {
    label: 'Dialog',
    description: 'Opened by id from any of your other surfaces, and outlives whatever opened it.',
  },
}
