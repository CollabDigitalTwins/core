// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { columns, useRows } from './components/{{COMPONENT}}'

import type { PluginContext } from '../sdk/types'

// A full page in the Datasets nav; the host renders the frame, search and table.
export function activate(ctx: PluginContext): void {
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
