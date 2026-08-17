// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../sdk/types'

import { SpaceDialog } from './components/SpaceDialog'
import { useSpacesLegend } from './components/SpacesLegend'
import { SpacesTab } from './components/SpacesTab'
import { SpacesTool } from './components/SpacesTool'

import type { PluginContext } from '../sdk/types'

/**
 * Four surfaces over the model IfcSpaces, all reading one hook. The IFC is never written to:
 * a renamed space is an annotation this plugin stores, and the dialog shows both names.
 */
export function activate(ctx: PluginContext): void {
  ctx.register('bim.tools', {
    id: 'hello-bim',
    label: 'Spaces',
    icon: 'Boxes',
    component: SpacesTool,
    stayActive: true,
  })

  ctx.register('viewer.tabs', {
    id: 'spaces',
    labelKey: 'tabTitle',
    icon: 'Boxes',
    // BIM only: there are no IfcSpaces to annotate on the map or in a point cloud.
    viewers: [ViewerNames.bim],
    component: SpacesTab,
  })

  ctx.register('viewer.legends', {
    id: 'spaces',
    title: 'Spaces',
    viewers: [ViewerNames.bim],
    useLegend: useSpacesLegend,
  })

  ctx.register('ui.dialogs', {
    id: 'detail',
    titleKey: 'dialogTitle',
    size: 'md',
    component: SpaceDialog,
  })
}
