// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useLegend } from './components/{{COMPONENT}}'

import type { PluginContext } from '../sdk/types'

// A legend contributes a hook, not a component: the host calls `useLegend` while rendering
// its own legend panel, which is what lets the rows carry live counts.
//
// Isolation rule, enforced by ESLint: a plugin may import from `../sdk/*` and its own files,
// never from the rest of core.
export function activate(ctx: PluginContext): void {
  ctx.register('map.legends', {
    id: '{{SLUG}}',
    title: '{{NAME}}',
    useLegend,
  })
}
