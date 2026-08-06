// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { HelloBimTool } from './components/HelloBimTool'

import type { PluginContext } from '../sdk/types'

/**
 * The worked example for the BIM viewer.
 *
 * Exercises the whole `bim.tools` surface end to end — query a category, read
 * element properties, drive the selection, control visibility, move the camera —
 * so that if the plugin/core boundary regresses, this stops working and a test
 * says so.
 *
 * Isolation rule, enforced by ESLint: a plugin may import from `../sdk/*` and its
 * own files, never from the rest of core.
 */
export function activate(ctx: PluginContext): void {
  ctx.register('bim.tools', {
    id: 'hello-bim',
    label: 'Hello BIM',
    icon: 'Boxes',
    component: HelloBimTool,
    stayActive: true,
  })
}
