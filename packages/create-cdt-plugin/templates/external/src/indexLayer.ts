// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { {{CONTEXT_TYPE}} } from '{{SURFACE_ENTRY}}'

// Something drawn on the map, mounted for as long as the map itself. Use this rather than
// a `map.tools` panel when the drawing has to outlive the toolbar dropdown — a panel
// unmounts when it closes, and would take its layers with it.
//
// The component renders nothing. It receives the map and manages its own sources and
// layers, removing them on cleanup.
//
// `register` may be called more than once. See the README before adding a second one:
// every capability has to be declared in the manifest, and each entry needs its own id.
export function activate(ctx: {{CONTEXT_TYPE}}): void {
  ctx.register('map.layers', {
    id: '{{SLUG}}',
    component: {{COMPONENT}},
  })
}
