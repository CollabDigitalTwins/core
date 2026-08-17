// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { PluginContext } from '../sdk/types'

// A modal the host owns, so any surface can open it by id and it outlives the opener.
export function activate(ctx: PluginContext): void {
  ctx.register('ui.dialogs', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    titleKey: '{{NAME}}',
    size: 'lg',
    component: {{COMPONENT}},
  })
}
