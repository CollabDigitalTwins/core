// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { {{CONTEXT_TYPE}} } from '{{SURFACE_ENTRY}}'

// A tab in the viewer sidebar; the platform owns the tab strip and the panel frame.
export function activate(ctx: {{CONTEXT_TYPE}}): void {
  ctx.register('viewer.tabs', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    labelKey: '{{NAME}}',
    // A name, not a component, so a plugin never imports the icon library.
    icon: '{{ICON}}',
    component: {{COMPONENT}},
    // Which viewers show this tab. Drop the line to appear in all of them.
    viewers: ['bim'],
  })
}
