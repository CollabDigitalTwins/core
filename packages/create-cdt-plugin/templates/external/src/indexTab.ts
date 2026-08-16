// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { {{CONTEXT_TYPE}} } from '{{SURFACE_ENTRY}}'

// A tab in the viewer sidebar, beside Files, Layers and Sensors. The platform owns the tab
// strip and the panel frame; this plugin supplies the icon, the label and what goes inside.
//
// `register` may be called more than once. See the README before adding a second one:
// every capability has to be declared in the manifest, and each entry needs its own id.
export function activate(ctx: {{CONTEXT_TYPE}}): void {
  ctx.register('viewer.tabs', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    labelKey: '{{NAME}}',
    // A string, resolved by the platform against its icon set. Naming it rather than
    // importing a component is what keeps `lucide-react` out of this plugin.
    icon: '{{ICON}}',
    component: {{COMPONENT}},
    // Which viewers show this tab. Drop the line to appear in all of them.
    viewers: ['bim'],
  })
}
