// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { PluginContext } from '../sdk/types'

// Drawn for as long as the map — a toolbar panel unmounts and takes its layers with it.
export function activate(ctx: PluginContext): void {
  ctx.register('map.layers', {
    id: '{{SLUG}}',
    component: {{COMPONENT}},
  })
}
