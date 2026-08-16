// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../sdk/types'

import { PickDialog } from './components/PickDialog'
import { usePicksLegend } from './components/PicksLegend'
import { pickColumns, usePickRows } from './components/PicksPage'
import { PicksTab } from './components/PicksTab'
import { PickTool } from './components/PickTool'


import type { PluginContext } from '../sdk/types'

/**
 * One plugin across five surfaces, which is what the contribution surfaces are for.
 *
 * `hello-map` and `hello-bim` each show one surface in isolation. This one shows the part
 * neither can: the tool, the legend, the tab, the page and the dialog all read and write
 * one `usePluginState` key, from React subtrees with no common ancestor. Without that,
 * spanning environments would mean shipping five unrelated widgets in one bundle.
 *
 * ESLint enforces the isolation rule — a plugin imports from `../sdk/*` and its own files,
 * never the rest of core.
 */
export function activate(ctx: PluginContext): void {
  ctx.register('map.tools', {
    id: 'pick',
    label: 'Pick a point',
    icon: 'MapPinPlus',
    component: PickTool,
    stayActive: true,
  })

  ctx.register('map.legends', {
    id: 'picks',
    title: 'Picked points',
    useLegend: usePicksLegend,
  })

  ctx.register('viewer.tabs', {
    id: 'picks',
    labelKey: 'tabTitle',
    icon: 'ListChecks',
    // Picked on the map, read in BIM. Omitting this would add the tab to the point cloud
    // viewer too, which has nothing to do with it.
    viewers: [ViewerNames.map, ViewerNames.bim],
    component: PicksTab,
  })

  ctx.register('data.pages', {
    id: 'picks',
    titleKey: 'pageTitle',
    icon: 'MapPinned',
    useRows: usePickRows,
    columns: pickColumns,
    emptyKey: 'empty',
  })

  ctx.register('ui.dialogs', {
    id: 'detail',
    titleKey: 'dialogTitle',
    size: 'md',
    component: PickDialog,
  })
}
