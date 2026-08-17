// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { columns, useRows } from './components/{{COMPONENT}}'

import type { {{CONTEXT_TYPE}} } from '{{SURFACE_ENTRY}}'

// A full page in the Datasets nav; the platform renders the frame, search and table.
export function activate(ctx: {{CONTEXT_TYPE}}): void {
  ctx.register('data.pages', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    titleKey: '{{NAME}}',
    // A name, not a component, so a plugin never imports the icon library.
    icon: '{{ICON}}',
    useRows,
    columns,
  })
}
