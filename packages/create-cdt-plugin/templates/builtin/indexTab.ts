// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import { ViewerNames } from '../sdk/types'

import type { PluginContext } from '../sdk/types'

// A tab in the viewer sidebar; the host owns the tab strip and the panel frame.
export function activate(ctx: PluginContext): void {
  ctx.register('viewer.tabs', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    labelKey: '{{NAME}}',
    // A name, not a component, so a plugin never imports the icon library.
    icon: '{{ICON}}',
    component: {{COMPONENT}},
    // Explicit on purpose: the field is optional, and omitting it means every viewer.
    viewers: {{VIEWERS}},
  })
}
