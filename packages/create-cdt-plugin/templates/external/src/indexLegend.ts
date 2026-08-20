// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useLegend } from './components/{{COMPONENT}}'

import type { LegendPluginContext } from '{{SURFACE_ENTRY}}'

// A legend contributes a hook, not a component: the platform calls `useLegend` while
// rendering its own legend panel, which is what lets the rows carry live counts.
//
// `register` may be called more than once. See the README before adding a second one: every
// capability has to be declared in the manifest, and each entry needs its own id.
export function activate(ctx: LegendPluginContext): void {
  ctx.register('viewer.legends', {
    id: '{{SLUG}}',
    title: '{{NAME}}',
    // Explicit on purpose: the field is optional, and omitting it means every viewer.
    viewers: {{VIEWERS}},
    useLegend,
  })
}
