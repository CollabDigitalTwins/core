// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { MapTool } from './components/MapTool'
import { MarkerDialog } from './components/MarkerDialog'
import { MarkersLayer } from './components/MarkersLayer'
import { useMarkersLegend } from './components/MarkersLegend'
import { markerColumns, useMarkerRows } from './components/MarkersPage'
import { MarkersTab } from './components/MarkersTab'

import type { LegendRegistration } from '@collabdt/plugin-kit/types/legend'
import type { MapToolProps, PluginContext } from '@collabdt/plugin-kit/types/map'

type Ctx = PluginContext<MapToolProps, unknown, unknown, LegendRegistration>

/**
 * Six surfaces over one store and one selection, in React subtrees with no common ancestor.
 * Without that shared state this would be six unrelated widgets in one bundle.
 */
export function activate(ctx: Ctx): void {
  ctx.register('map.tools', {
    id: 'hello-map',
    label: 'Hello Map',
    icon: 'MapPinPlus',
    component: MapTool,
    stayActive: true,
  })

  // Separate from the tool, whose panel unmounts when its dropdown closes.
  ctx.register('map.layers', {
    id: 'markers',
    component: MarkersLayer,
  })

  ctx.register('viewer.legends', {
    id: 'markers',
    title: 'Markers',
    // Map only: a list of map markers means nothing in BIM.
    viewers: ['map'],
    useLegend: useMarkersLegend,
  })

  ctx.register('viewer.tabs', {
    id: 'markers',
    labelKey: 'tabTitle',
    icon: 'MapPin',
    // Recorded on the map, read in BIM; the point cloud has nothing to do with it.
    viewers: ['map', 'bim'],
    component: MarkersTab,
  })

  ctx.register('data.pages', {
    id: 'markers',
    titleKey: 'pageTitle',
    icon: 'MapPinned',
    useRows: useMarkerRows,
    columns: markerColumns,
    emptyKey: 'empty',
    searchKeys: ['name'],
  })

  ctx.register('ui.dialogs', {
    id: 'detail',
    titleKey: 'dialogTitle',
    size: 'md',
    component: MarkerDialog,
  })
}
