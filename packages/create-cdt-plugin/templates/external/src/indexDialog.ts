// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { {{CONTEXT_TYPE}} } from '{{SURFACE_ENTRY}}'

// A modal the platform owns, so any surface can open it by id and it outlives the opener.
export function activate(ctx: {{CONTEXT_TYPE}}): void {
  ctx.register('ui.dialogs', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    titleKey: '{{NAME}}',
    size: 'lg',
    component: {{COMPONENT}},
  })
}
