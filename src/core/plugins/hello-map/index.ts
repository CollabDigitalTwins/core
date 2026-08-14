// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { HelloMapTool } from './components/HelloMapTool'

import type { PluginContext } from '../sdk/types'

/**
 * The tutorial plugin: the smallest thing that renders and reads the viewer. One
 * capability, one component; `hello-bim` is the fuller example.
 *
 * ESLint enforces the isolation rule — a plugin imports from `../sdk/*` and its own
 * files, never the rest of core.
 */
export function activate(ctx: PluginContext): void {
  ctx.register('map.tools', {
    id: 'hello-map',
    label: 'Hello Map',
    icon: 'MapPin',
    component: HelloMapTool,
    stayActive: true,
  })
}
