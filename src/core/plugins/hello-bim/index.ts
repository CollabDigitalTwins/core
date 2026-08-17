// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../sdk/types'

import { SpaceDialog } from './components/SpaceDialog'
import { useSpacesLegend } from './components/SpacesLegend'
import { SpacesTab } from './components/SpacesTab'
import { SpacesTool } from './components/SpacesTool'

import type { PluginContext } from '../sdk/types'

/**
 * The BIM counterpart to `hello-map`: one plugin across four surfaces, all reading the same
 * spaces and the same annotations.
 *
 * What it demonstrates that the map example cannot: reading a real model — IfcSpaces and
 * their IFC attributes — and painting elements through the SDK's bucketed appearance API
 * rather than per element, which would exhaust the model's material slots.
 *
 * The IFC itself is never written to. A renamed space is an annotation this plugin stores
 * and displays; the model keeps its own name, and the dialog shows both.
 *
 * ESLint enforces the isolation rule — a plugin imports from `../sdk/*` and its own files,
 * never the rest of core.
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
