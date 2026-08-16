// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { PluginContext } from '../sdk/types'

// A tab in the viewer sidebar, beside Files, Layers and Sensors. The host owns the tab strip
// and the panel frame; this plugin supplies the icon, the label and what goes inside.
//
// Isolation rule, enforced by ESLint: a plugin may import from `../sdk/*` and its own files,
// never from the rest of core.
export function activate(ctx: PluginContext): void {
  ctx.register('viewer.tabs', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    labelKey: '{{NAME}}',
    // A string, resolved by the host against its icon set, so a plugin never imports the
    // icon library.
    icon: '{{ICON}}',
    component: {{COMPONENT}},
    // Which viewers show this tab. Drop the line to appear in all of them.
    viewers: ['bim'],
  })
}
