// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../sdk/types'

import { MapTool } from './components/MapTool'
import { MarkerDialog } from './components/MarkerDialog'
import { MarkersLayer } from './components/MarkersLayer'
import { useMarkersLegend } from './components/MarkersLegend'
import { markerColumns, useMarkerRows } from './components/MarkersPage'
import { MarkersTab } from './components/MarkersTab'

import type { PluginContext } from '../sdk/types'

/**
 * One plugin across six surfaces, which is what the contribution surfaces are for.
 *
 * `hello-bim` shows a single surface in isolation. This one shows the part it cannot: the
 * tool, the layer, the legend, the tab, the page and the dialog all read one store and one
 * selection, from React subtrees with no common ancestor. Without that, spanning
 * environments would mean shipping six unrelated widgets in one bundle.
 *
 * ESLint enforces the isolation rule — a plugin imports from `../sdk/*` and its own files,
 * never the rest of core.
 */
export function activate(ctx: PluginContext): void {
  ctx.register('map.tools', {
    id: 'hello-map',
    label: 'Hello Map',
    icon: 'MapPinPlus',
    component: MapTool,
    stayActive: true,
  })

  // Separate from the tool because the tool's panel unmounts when its dropdown closes.
  // This stays mounted for as long as the map, so markers survive that — and so a marker
  // added from the sidebar tab has a layer to appear on.
  ctx.register('map.layers', {
    id: 'markers',
    component: MarkersLayer,
  })

  ctx.register('map.legends', {
    id: 'markers',
    title: 'Markers',
    useLegend: useMarkersLegend,
  })

  ctx.register('viewer.tabs', {
    id: 'markers',
    labelKey: 'tabTitle',
    icon: 'MapPin',
    // Recorded on the map, read in BIM. Omitting this would add the tab to the point cloud
    // viewer too, which has nothing to do with it.
    viewers: [ViewerNames.map, ViewerNames.bim],
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
