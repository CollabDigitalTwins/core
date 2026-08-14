// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { HelloBimTool } from './components/HelloBimTool'

import type { PluginContext } from '../sdk/types'

/**
 * The worked example for the BIM viewer. Exercises the whole `bim.tools` surface —
 * query a category, read properties, drive the selection, control visibility, move
 * the camera — so a regression at the plugin/core boundary breaks a test.
 *
 * ESLint enforces the isolation rule — a plugin imports from `../sdk/*` and its own
 * files, never the rest of core.
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
