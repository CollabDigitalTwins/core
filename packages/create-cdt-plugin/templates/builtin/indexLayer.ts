// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { PluginContext } from '../sdk/types'

// Something drawn on the map, mounted for as long as the map itself. Use this rather than
// a `map.tools` panel when the drawing has to outlive the toolbar dropdown — a panel
// unmounts when it closes, and would take its layers with it.
//
// The component renders nothing. It receives the map and manages its own sources and
// layers, removing them on cleanup.
//
// Isolation rule, enforced by ESLint: a plugin may import from `../sdk/*` and its own
// files, never from the rest of core.
export function activate(ctx: PluginContext): void {
  ctx.register('map.layers', {
    id: '{{SLUG}}',
    component: {{COMPONENT}},
  })
}
