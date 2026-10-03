// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { dataset } from './components/{{COMPONENT}}'

import type { UiPluginContext } from '{{SURFACE_ENTRY}}'

// Listed in the Datasets menu; it reaches the map only once a user applies it there.
export function activate(ctx: UiPluginContext): void {
  ctx.register('map.datasets', {
    id: '{{SLUG}}',
    ...dataset,
  })
}
