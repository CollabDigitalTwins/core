// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { HelloMapTool } from './components/HelloMapTool'

import type { PluginContext } from '../sdk/types'

/**
 * The tutorial plugin: the smallest thing that renders and reads the viewer.
 *
 * Deliberately kept to one capability and one component. `hello-bim` is the
 * fuller worked example — data, queries and selection.
 *
 * Isolation rule, enforced by ESLint: a plugin may import from `../sdk/*` and its
 * own files, never from the rest of core.
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
